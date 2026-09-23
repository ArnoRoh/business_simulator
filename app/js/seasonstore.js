// Season records: a separate IndexedDB database. Legacy saves ('business-simulator'
// IndexedDB and the intro's localStorage keys) are never read for writing or changed.
//
// One record per run: { schema, version, id, run, seed, calc, content, startedAt,
// updatedAt, rev, log: [{ n, at, week, action }], state }. Each committed action and its
// resulting state are one put, so a reload shows the result and never repeats it.
// `rev` guards against a second tab: a write whose expected rev is stale is refused.
export const DB = 'mv-bs-season';
export const SCHEMA = 'mv-bs-season-record';
export const VERSION = 1;
let db = null;

export async function open() {
  db?.close();
  db = null;
  const opened = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('runs', { keyPath: 'id' });
      request.result.createObjectStore('meta');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('blocked'));
  });
  db = opened;
  opened.onversionchange = () => { opened.close(); if (db === opened) db = null; };
}

const tx = (stores, mode, body) => new Promise((resolve, reject) => {
  if (!db) { reject(new Error('unavailable')); return; }
  const t = db.transaction(stores, mode);
  let out;
  t.oncomplete = () => resolve(out);
  t.onabort = t.onerror = () => reject(t.error || new Error(out?.error || 'aborted'));
  out = body(t);
});


export async function list() {
  return tx(['runs'], 'readonly', t => {
    const out = [];
    t.objectStore('runs').openCursor().onsuccess = e => {
      const c = e.target.result;
      if (c) { const v = c.value; out.push({ id: v.id, run: v.run, week: v.state?.week, updatedAt: v.updatedAt, phase: v.state?.phase }); c.continue(); }
    };
    return out;
  });
}

export async function active() {
  const id = await tx(['meta'], 'readonly', t => { const r = t.objectStore('meta').get('active'); return r; }).then(r => r.result);
  return id ? tx(['runs'], 'readonly', t => t.objectStore('runs').get(id)).then(r => r.result || null) : null;
}

// Compare-and-put. Resolves the new rev; rejects Error('conflict') on a stale tab.
export async function save(record, expected) {
  const next = { ...record, rev: expected + 1, updatedAt: new Date().toISOString() };
  let conflict = false;
  await tx(['runs', 'meta'], 'readwrite', t => {
    const runs = t.objectStore('runs');
    const r = runs.get(record.id);
    r.onsuccess = () => {
      const stored = r.result?.rev ?? 0;
      if (stored !== expected) { conflict = true; t.abort(); return; }
      runs.put(next);
      t.objectStore('meta').put(record.id, 'active');
    };
  }).catch(error => { throw conflict ? new Error('conflict') : error; });
  return next.rev;
}

export async function activate(id) {
  await tx(['meta'], 'readwrite', t => { t.objectStore('meta').put(id, 'active'); });
}
export async function read(id) {
  return tx(['runs'], 'readonly', t => t.objectStore('runs').get(id)).then(r => r.result || null);
}
export async function remove(id) {
  await tx(['runs'], 'readwrite', t => { t.objectStore('runs').delete(id); });
}

// Detect earlier games without opening them for writing.
export async function legacy() {
  const keys = ['business-simulator:asha-intro:v3', 'asha-stall-v2', 'business-simulator:v1'];
  let found = false;
  try { found = keys.some(k => localStorage.getItem(k)); } catch { /* storage blocked */ }
  try { found ||= (await indexedDB.databases?.() || []).some(d => d.name === 'business-simulator'); } catch { /* unsupported */ }
  return found;
}
