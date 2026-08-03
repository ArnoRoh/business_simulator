// Simulation engine.
//
// The weekly P&L is COMPUTED here, never authored in content. That matters: if a
// scenario author could hand-write the outcome, the numbers would stop being
// consistent and the learner would be memorising a story instead of reasoning about
// a system. Content supplies decisions and their effects on state; the economics
// fall out.
//
// See docs/game-design.md ("Systems modelled").

export const DEFAULT_STATE = {
  week: 1,
  cash: 150000,
  price: 500,
  unitCost: 300,
  demand: 200,
  capacity: 180,
  reputation: 50,
  hygiene: 60,
  formality: 0,
  staff: 0,
  ownerHours: 60,
  ownerHoursUsed: 40,
  rent: 20000,
  wagePerStaff: 30000,
  licenceFees: 0,
  spoilRate: 0.5,
  keepsRecords: false,
  flags: {},
};

// Fields where a plain number in `effects` ADDS to the current value.
const ADDITIVE = new Set([
  'cash', 'demand', 'capacity', 'reputation', 'hygiene',
  'ownerHoursUsed', 'ownerHours', 'rent', 'licenceFees',
]);

// Fields where a plain number REPLACES the current value.
const ABSOLUTE = new Set([
  'price', 'unitCost', 'staff', 'formality', 'wagePerStaff', 'spoilRate', 'week',
]);

const CLAMPED = { reputation: [0, 100], hygiene: [0, 100], formality: [0, 3] };

export function createState(overrides = {}) {
  const state = { ...DEFAULT_STATE, ...overrides };
  state.flags = { ...DEFAULT_STATE.flags, ...(overrides.flags || {}) };
  return state;
}

/**
 * Weekly profit and loss, derived entirely from state.
 *
 * Spoilage only applies to unsold *made* stock. A learner who builds capacity
 * ahead of demand pays for it — that is the lesson, so it must be real.
 */
export function weeklyPnl(state) {
  const unitsSold = Math.max(0, Math.min(state.demand, state.capacity));
  const revenue = unitsSold * state.price;
  const variableCost = unitsSold * state.unitCost;

  const unsoldCapacity = Math.max(0, state.capacity - state.demand);
  const spoilage = Math.round(unsoldCapacity * state.unitCost * (state.spoilRate || 0));

  const wages = state.staff * state.wagePerStaff;
  const fixedCost = state.rent + wages + (state.licenceFees || 0);

  const profit = revenue - variableCost - fixedCost - spoilage;
  const margin = revenue > 0 ? (revenue - variableCost) / revenue : 0;

  return {
    unitsSold,
    unmetDemand: Math.max(0, state.demand - state.capacity),
    revenue,
    variableCost,
    grossProfit: revenue - variableCost,
    margin,
    wages,
    rent: state.rent,
    licenceFees: state.licenceFees || 0,
    fixedCost,
    spoilage,
    profit,
  };
}

/**
 * Apply a content-authored `effects` object to state.
 *
 * String values prefixed "+" or "-" force additive behaviour, so content can nudge
 * an otherwise-absolute field. Unknown keys land in `flags` rather than silently
 * corrupting state.
 */
export function applyEffects(state, effects = {}) {
  const next = { ...state, flags: { ...state.flags } };

  for (const [key, raw] of Object.entries(effects)) {
    if (typeof raw === 'boolean') {
      if (key in next && typeof next[key] === 'boolean') next[key] = raw;
      else next.flags[key] = raw;
      continue;
    }

    const forcedAdditive = typeof raw === 'string' && /^[+-]/.test(raw);
    const value = Number(raw);

    if (Number.isNaN(value)) {
      next.flags[key] = raw;
      continue;
    }

    if (!(key in next)) {
      next.flags[key] = value;
      continue;
    }

    if (forcedAdditive || ADDITIVE.has(key)) {
      next[key] = (Number(next[key]) || 0) + value;
    } else if (ABSOLUTE.has(key)) {
      next[key] = value;
    } else {
      next[key] = value;
    }
  }

  for (const [key, [lo, hi]] of Object.entries(CLAMPED)) {
    if (typeof next[key] === 'number') {
      next[key] = Math.max(lo, Math.min(hi, next[key]));
    }
  }

  next.capacity = Math.max(0, Math.round(next.capacity));
  next.demand = Math.max(0, Math.round(next.demand));
  next.staff = Math.max(0, Math.round(next.staff));

  return next;
}

/**
 * Advance one week: bank the profit, apply slow drift.
 *
 * Reputation and hygiene drift because neglect has a cost — a business does not hold
 * still. Demand follows reputation with a lag, so the consequence of a hygiene
 * failure arrives after the decision that caused it, not alongside it
 * (docs/game-design.md: consequences arrive on a realistic lag).
 */
export function advanceWeek(state) {
  const pnl = weeklyPnl(state);
  const next = { ...state, flags: { ...state.flags } };

  next.cash = state.cash + pnl.profit;
  next.week = state.week + 1;

  if (state.hygiene < 40) next.reputation = Math.max(0, state.reputation - 4);
  else if (state.hygiene > 75) next.reputation = Math.min(100, state.reputation + 1);

  const repPull = Math.round((next.reputation - 50) * 0.6);
  next.demand = Math.max(0, state.demand + repPull);

  next.hygiene = Math.max(0, state.hygiene - 1);

  return { state: next, pnl };
}

/** Owner time is a scarce resource — this is what makes delegation visible. */
export function ownerLoad(state) {
  const used = state.ownerHoursUsed;
  const total = state.ownerHours || 1;
  return { used, total, fraction: Math.min(1.5, used / total), overloaded: used > total };
}

/**
 * Is this state failing? Used for the setback chapter, not for a game over —
 * failure is a chapter boundary here (docs/game-design.md).
 */
export function healthCheck(state) {
  const pnl = weeklyPnl(state);
  const problems = [];
  if (state.cash < 0) problems.push('cash-negative');
  if (pnl.profit < 0) problems.push('loss-making');
  if (state.hygiene < 35) problems.push('hygiene-risk');
  if (pnl.spoilage > pnl.grossProfit * 0.3 && pnl.spoilage > 0) problems.push('spoilage-high');
  if (ownerLoad(state).overloaded) problems.push('owner-overloaded');
  return problems;
}
