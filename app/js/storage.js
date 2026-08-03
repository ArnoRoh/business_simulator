// Local-first persistence.
//
// The learner holds their own record (SECURITY.md). Nothing is transmitted anywhere —
// there is no network code in this application at all, by design.
//
// Save continuously and assume the app is killed mid-decision, because on the target
// devices it will be (docs/localization.md).

const KEY = 'business-simulator:v1';

export function save(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
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
    return parsed;
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

/** Export the learner's own record so they can keep or share it deliberately. */
export function exportJson(session) {
  return JSON.stringify(session, null, 2);
}
