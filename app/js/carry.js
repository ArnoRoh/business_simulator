// What travels between chapters (ADR-0007, D-016).
//
// Six flags, and the list is closed. Not simulation state — facts about how the
// previous chapter was played. Each chapter still opens on an authored `startState`,
// which is what keeps it testable: validate-scenario.mjs walks paths from a known
// position, and a chapter seeded by an arbitrary ending has no known position to walk
// from.
//
// Three rules the rest of this file exists to enforce:
//
//   * Flags TINT, they never GATE. Nothing here can make a chapter unplayable.
//   * Absent flags are legal. A learner starting at chapter 3 has none, and every
//     chapter must read correctly with an empty carry.
//   * Nothing is summed. These are observations, not a score across chapters
//     (ADR-0004).

/**
 * The closed set. A chapter that wants a seventh needs an entry in DECISIONS.md
 * first — see ADR-0007, "Revisit if".
 */
export const CARRY_FLAGS = [
  'keepsRecords',   // kept proper books
  'formality',      // 0-3, registration reached
  'tookCredit',     // financed growth by borrowing rather than saving
  'builtTeam',      // hired and delegated rather than working more hours
  'heldStandard',   // passed the quality and hygiene decisions cleanly
  'concentrated',   // ended reliant on one large customer
];

/** Anything outside the closed set is dropped, wherever it came from. */
export function emptyCarry() {
  return {};
}

/**
 * Read the carried flags out of a finished chapter.
 *
 * Content sets these as ordinary effects during play — `"keepsRecords": true` on an
 * option — so they land either on state or in `state.flags`. Both are checked, and
 * nothing outside CARRY_FLAGS survives.
 */
export function collectCarry(state, previous = {}) {
  const carry = { ...pickKnown(previous) };
  if (!state) return carry;

  for (const flag of CARRY_FLAGS) {
    const value = flag in state ? state[flag] : (state.flags || {})[flag];
    if (value === undefined || value === null) continue;
    carry[flag] = typeof value === 'number' ? value : Boolean(value);
  }
  return carry;
}

function pickKnown(carry) {
  const out = {};
  for (const flag of CARRY_FLAGS) {
    if (carry && carry[flag] !== undefined && carry[flag] !== null) out[flag] = carry[flag];
  }
  return out;
}

/**
 * Does one authored `carryIn` rule match the carry we are holding?
 *
 * `when` matches a boolean or an exact value; `atLeast` matches a number floor. A rule
 * whose flag is absent never matches, which is what makes an empty carry safe.
 */
function matches(rule, carry) {
  if (!rule || !CARRY_FLAGS.includes(rule.flag)) return false;
  const value = carry[rule.flag];
  if (value === undefined) return false;
  if (rule.atLeast !== undefined) return Number(value) >= Number(rule.atLeast);
  if (rule.when !== undefined) return value === rule.when;
  return Boolean(value);
}

/**
 * Apply a scenario's `carryIn` rules to its authored opening.
 *
 * Returns the overrides to merge into `startState` and the notes to show above the
 * first situation. The authored `startState` is never replaced — only fields named in
 * a matching rule's own `startState` block move, so the opening position stays
 * something a scenario author chose and a validator can walk from.
 */
export function applyCarryIn(scenario, carry = {}) {
  const rules = Array.isArray(scenario && scenario.carryIn) ? scenario.carryIn : [];
  const known = pickKnown(carry);
  const overrides = {};
  const notes = [];

  for (const rule of rules) {
    if (!matches(rule, known)) continue;
    Object.assign(overrides, rule.startState || {});
    if (rule.note) notes.push(rule.note);
  }

  return { startState: { ...(scenario.startState || {}), ...overrides }, notes, carry: known };
}

/**
 * The situation text for a turn, given what the learner brought with them.
 *
 * A turn may declare one `carryVariant`. This is the whole of the turn-level tinting
 * budget on purpose: ADR-0007 caps a flag's reach at two turns per chapter, and a
 * mechanism that could do more would be used for more.
 */
export function situationFor(turn, carry = {}) {
  const variant = turn && turn.carryVariant;
  if (variant && matches(variant, pickKnown(carry)) && variant.situation) return variant.situation;
  return turn && turn.situation;
}

/**
 * The carry as record observations — facts about what was done, never a total.
 */
export function carrySummary(carry = {}) {
  return CARRY_FLAGS
    .filter((flag) => carry[flag] !== undefined)
    .map((flag) => ({ flag, value: carry[flag] }));
}
