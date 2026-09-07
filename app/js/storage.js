// Local attempts and profiles. No account, network sync, or automatic record deletion.
const DB_NAME = 'business-simulator';
const VERSION = 2;
let db;
let active = 'default';
let writes = Promise.resolve();
const dirty = new Set();
const memory = new Map(); // Continue visibly unsaved when browser storage is unavailable.
export let storageError = null;
const copy = (value) => JSON.parse(JSON.stringify(value));
export function newId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

async function read(key) {
  await writes;
  if (!db || dirty.has(key)) return copy(memory.get(key) ?? null);
  return new Promise((resolve, reject) => {
    const request = db.transaction('items').objectStore('items').get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function write(entries) {
  const snapshot = copy(entries);
  const run = writes.then(() => {
    for (const [key, value] of snapshot) memory.set(key, value);
    if (!db) throw new Error('Storage unavailable');
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('items', 'readwrite');
      for (const [key, value] of snapshot) transaction.objectStore('items').put(value, key);
      transaction.oncomplete = () => { for (const [key] of snapshot) dirty.delete(key); if (!/Legacy|version/.test(storageError || '')) storageError = null; resolve(true); };
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
    });
  });
  writes = run.catch((error) => { for (const [key] of snapshot) dirty.add(key); storageError = error.message; return false; });
  return writes;
}

export async function init() {
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('items');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Storage upgrade blocked'));
    });
    db.onversionchange = () => { db.close(); db = null; storageError = 'Storage changed'; };
  } catch (error) { storageError = error.message; }
  const settings = await read('settings');
  active = settings?.active || 'default';
  if (!await read(`profile:${active}`)) {
    await write([[`profile:${active}`, { id: active, number: 1, label: '', carry: { flags: {}, completed: [] } }]]);
  }
  if (!await read('legacy')) {
    let raw = null, carryRaw = null;
    try { raw = localStorage.getItem('business-simulator:v1'); carryRaw = localStorage.getItem('business-simulator:carry:v1'); } catch { /* inaccessible storage remains untouched */ }
    const entries = [['legacy', { raw, carryRaw }]];
    try {
      const old = raw ? JSON.parse(raw) : null;
      if (old && (!old.schemaVersion || old.schemaVersion === 1) && old.state && Array.isArray(old.history) && Array.isArray(old.record?.observations) && Number.isInteger(old.turnIndex) && typeof old.scenarioId === 'string') {
        old.id = newId(); old.profileId = active; old.schemaVersion = VERSION;
        old.legacy = true; old.updatedAt = new Date().toISOString();
        old.record.scenarioVersion = 'legacy-unknown';
        old.record.calculationVersion = 'legacy-unknown';
        entries.push([`attempt:${old.id}`, old], [`latest:${active}:${old.scenarioId}`, old.id], [`current:${active}`, old.scenarioId]);
      } else if (raw) storageError = 'Legacy save needs review';
      const carry = carryRaw ? JSON.parse(carryRaw) : null;
      if (carry && Array.isArray(carry.completed)) entries.push([`profile:${active}`, { id: active, number: 1, label: '', carry }]);
    } catch { storageError = 'Legacy save needs review'; }
    await write(entries); // Original localStorage keys are deliberately retained.
  }
}

export async function load(chapterId) {
  const chapter = chapterId || await read(`current:${active}`);
  if (!chapter) return null;
  const id = await read(`latest:${active}:${chapter}`);
  const saved = id ? await read(`attempt:${id}`) : null;
  if (!saved) return null;
  if (saved.schemaVersion !== VERSION || !saved.state || !Number.isFinite(saved.state.cash) || !Number.isInteger(saved.turnIndex) || saved.turnIndex < 0 || !Array.isArray(saved.history) || !Array.isArray(saved.record?.observations)) {
    storageError = 'Save version needs review';
    throw new Error(storageError);
  }
  return saved;
}

export function save(session, carry) {
  session.id ||= newId();
  session.profileId ||= active;
  const saved = { ...session, schemaVersion: VERSION, updatedAt: new Date().toISOString() };
  return write([
    [`attempt:${session.id}`, saved],
    [`latest:${session.profileId}:${session.scenarioId}`, session.id],
    [`current:${session.profileId}`, session.scenarioId],
    ...(carry ? [[`carry:${session.profileId}`, carry]] : []),
  ]);
}

export async function loadCarry() {
  return await read(`carry:${active}`) || (await read(`profile:${active}`))?.carry || { flags: {}, completed: [] };
}
export function saveCarry(carry) { return write([[`carry:${active}`, carry]]); }
export async function profiles() {
  if (!db) return [...memory.entries()].filter(([key]) => key.startsWith('profile:')).map(([, value]) => copy(value));
  await writes;
  return new Promise((resolve, reject) => {
    const request = db.transaction('items').objectStore('items').openCursor();
    const found = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(found);
      if (String(cursor.key).startsWith('profile:')) found.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}
export async function switchProfile(id) {
  active = id || newId();
  if (!id) {
    const number = Math.max(0, ...(await profiles()).map(p => p.number || 1)) + 1;
    await write([[`profile:${active}`, { id: active, number, label: '', carry: { flags: {}, completed: [] } }]]);
  }
  await write([['settings', { active }]]);
  return active;
}
export function profileId() { return active; }
export async function backup(profileOnly = false) {
  const selected = entries => profileOnly ? entries.filter(([key, value]) => value?.profileId === active || value?.id === active || key === `carry:${active}` || key === `current:${active}` || key.startsWith(`latest:${active}:`) || (active === 'default' && key === 'legacy')) : entries;
  await writes;
  if (!db) return selected([...memory.entries()]);
  return new Promise((resolve, reject) => {
    const request = db.transaction('items').objectStore('items').openCursor();
    const rows = [];
    request.onsuccess = () => { const c = request.result; if (!c) return resolve(selected([...new Map([...rows, ...[...dirty].map(key => [key, memory.get(key)])]) ])); rows.push([c.key, c.value]); c.continue(); };
    request.onerror = () => reject(request.error);
  });
}
export async function deleteProfile(id) {
  await writes;
  const entries = await backup();
  const keys = entries.filter(([key, value]) => (id === 'default' && key === 'legacy') || key === `profile:${id}` || key === `carry:${id}` || key === `current:${id}` || key.startsWith(`latest:${id}:`) || (key.startsWith('attempt:') && value.profileId === id)).map(([key]) => key);
  if (db) await new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite');
    for (const key of keys) tx.objectStore('items').delete(key);
    tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(tx.error);
  });
  for (const key of keys) { memory.delete(key); dirty.delete(key); }
  if (id === 'default') {
    try { localStorage.removeItem('business-simulator:v1'); localStorage.removeItem('business-simulator:carry:v1'); } catch { storageError = 'Legacy deletion failed'; }
  }
  if (id === active) await switchProfile();
}

export async function selectAttempt(id) {
  const attempt = await read(`attempt:${id}`);
  if (!attempt || attempt.profileId !== active) throw new Error('Attempt not available');
  await write([[`latest:${active}:${attempt.scenarioId}`, id], [`current:${active}`, attempt.scenarioId]]);
}
