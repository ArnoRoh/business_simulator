// Local-first persistence.
//
// The learner holds their own record (SECURITY.md). Nothing is transmitted anywhere —
// there is no network code in this application at all, by design.
//
// Save continuously and assume the app is killed mid-decision, because on the target
// devices it will be (docs/localization.md).

const KEY = 'business-simulator:v1';

// Versioning for the saved session itself (the record inside it has its own, in
// record.js). The shape is about to grow — ADR-0008 proposes an install identifier
// and a recruitment channel — and a save written by an older build must survive the
// update rather than be discarded, because the app updates itself under the learner's
// feet: sw.js swaps in a new shell mid-run. Stamp on write, migrate on read.
const SESSION_SCHEMA_VERSION = 1;

/** Bring a session from whatever version wrote it up to the current one. */
function migrate(parsed) {
  // Sessions written before versioning existed are version 1 by definition.
  if (typeof parsed.schemaVersion !== 'number') parsed.schemaVersion = 1;
  // Future migrations chain here:
  //   if (parsed.schemaVersion < 2) { ...transform...; parsed.schemaVersion = 2; }
  return parsed;
}

export function save(session) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: SESSION_SCHEMA_VERSION, ...session }),
    );
    return true;
  } catch (err) {
    // Private browsing or a full quota. Play continues in memory rather than dying.
    console.warn('Could not save progress:', err);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return migrate(parsed);
  } catch (err) {
    console.warn('Could not load saved progress:', err);
    return null;
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  return load() !== null;
}

// --- chapters (ADR-0007) ---------------------------------------------------
//
// Two things persist beyond a single chapter: which chapters have been finished, and
// the six carried flags. Both are small, both are the learner's own, and both stay on
// the device like everything else here.

const CARRY_KEY = 'business-simulator:carry:v1';

export function loadCarry() {
  try {
    const raw = localStorage.getItem(CARRY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { flags: {}, completed: [] };
    return { flags: parsed.flags || {}, completed: parsed.completed || [] };
  } catch (err) {
    console.warn('Could not load chapter progress:', err);
    return { flags: {}, completed: [] };
  }
}

export function saveCarry(carry) {
  try {
    localStorage.setItem(CARRY_KEY, JSON.stringify({
      flags: carry.flags || {},
      completed: carry.completed || [],
    }));
    return true;
  } catch (err) {
    console.warn('Could not save chapter progress:', err);
    return false;
  }
}

export function clearCarry() {
  try {
    localStorage.removeItem(CARRY_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Export the learner's own record so they can keep or share it deliberately. */
export function exportJson(session) {
  return JSON.stringify(session, null, 2);
}
