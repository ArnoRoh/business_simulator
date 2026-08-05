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

  // The demand this business would have at an average reputation. Weekly drift pulls
  // `demand` towards a scaled version of this rather than accumulating without limit.
  baseDemand: 200,

  capacity: 180,
  reputation: 50,
  hygiene: 60,
  formality: 0,
  staff: 0,
  ownerHours: 60,
  ownerHoursUsed: 40,

  // Weekly overhead that is not proportional to output — buying, banking, travel.
  // Content adjusts THIS for a permanent change to the owner's weekly load; adjusting
  // `ownerHoursUsed` only affects the current week, because advanceWeek recomputes it.
  ownerHoursFixed: 15,

  rent: 20000,
  wagePerStaff: 30000,
  licenceFees: 0,
  spoilRate: 0.5,
  keepsRecords: false,
  flags: {},

  // Consequences scheduled by an earlier decision, waiting for their week to arrive.
  // Each is { dueWeek, effects, cause, causeWeek }. See scheduleLater().
  pending: [],
};

// Thresholds that map a change in weekly profit onto a prediction band.
//
// These used to live only in scripts/validate-scenario.mjs, which meant "up a little"
// had a precise meaning to the validator and a vague one to the learner — the learner
// was graded against a boundary nobody had shown them (Q-014). They are exported now so
// the app can label each choice with the actual amounts.
export const BAND_SAME = 1500;
export const BAND_LOT = 12000;

export function bandFor(delta) {
  if (delta < -BAND_SAME) return 'down';
  if (delta <= BAND_SAME) return 'same';
  if (delta <= BAND_LOT) return 'up_bit';
  return 'up_lot';
}

// Fields where a plain number in `effects` ADDS to the current value.
const ADDITIVE = new Set([
  'cash', 'demand', 'capacity', 'reputation', 'hygiene',
  'ownerHoursUsed', 'ownerHours', 'ownerHoursFixed', 'rent', 'licenceFees',
]);

// Fields where a plain number REPLACES the current value.
const ABSOLUTE = new Set([
  'price', 'unitCost', 'staff', 'formality', 'wagePerStaff', 'spoilRate', 'week',
]);

const CLAMPED = { reputation: [0, 100], hygiene: [0, 100], formality: [0, 3] };

// The standard an owner holds without effort. Weekly slippage stops here; going below
// takes active neglect (see the overload penalty in advanceWeek).
const HYGIENE_FLOOR = 40;

export function createState(overrides = {}) {
  const state = { ...DEFAULT_STATE, ...overrides };
  state.flags = { ...DEFAULT_STATE.flags, ...(overrides.flags || {}) };
  state.pending = [...(overrides.pending || [])];

  // Derive the opening week's load from the opening state, unless content pins it.
  // Otherwise week 1 shows a default that does not match the business on screen.
  if (!('ownerHoursUsed' in overrides)) state.ownerHoursUsed = baseOwnerHours(state);
  if (!('baseDemand' in overrides)) state.baseDemand = state.demand;
  if (!('openingDemand' in overrides)) state.openingDemand = state.demand;

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
  // `pending` must be cloned, not shared. Without this, projecting a trajectory would
  // drain the real playthrough's scheduled consequences.
  const next = { ...state, flags: { ...state.flags }, pending: [...(state.pending || [])] };

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

  // A demand change authored in content is structural — a customer won or lost, not a
  // mood swing — so it moves the baseline the weekly reputation drift pulls towards.
  // Without this, winning the hotel contract would be undone over the following weeks.
  //
  // The floor matters: several authored penalties in a row would otherwise take the
  // baseline to nothing and the business could never recover, which is not how a stall
  // by a bus stand behaves however badly it is run. Being reduced to passing trade is
  // the lesson; being erased is just an unwinnable game.
  if (next.demand !== state.demand) {
    const baseline = next.baseDemand ?? state.demand;
    const floor = Math.round((next.openingDemand ?? baseline) * 0.25);
    next.baseDemand = Math.max(floor, baseline + (next.demand - state.demand));
  }

  return next;
}

/**
 * Schedule a consequence to arrive some weeks from now.
 *
 * The whole point is attribution: when it fires, the learner is told which earlier
 * decision caused it. A consequence the learner cannot trace back to a choice teaches
 * nothing except that the world is arbitrary.
 */
export function scheduleLater(state, later = [], cause = '') {
  if (!later || later.length === 0) return state;
  const next = { ...state, flags: { ...state.flags }, pending: [...(state.pending || [])] };

  for (const item of later) {
    next.pending.push({
      dueWeek: state.week + (item.inWeeks || 1),
      effects: item.effects || {},
      cause: item.cause || cause,
      causeWeek: state.week,
    });
  }
  return next;
}

/**
 * Advance one week: bank the profit, fire anything now due, apply slow drift.
 *
 * Reputation and hygiene drift because neglect has a cost — a business does not hold
 * still. Demand follows reputation with a lag, so the consequence of a hygiene
 * failure arrives after the decision that caused it, not alongside it
 * (docs/game-design.md: consequences arrive on a realistic lag).
 *
 * Returns `fired` so the UI can show what arrived and why.
 */
export function advanceWeek(state) {
  const pnl = weeklyPnl(state);
  let next = { ...state, flags: { ...state.flags }, pending: [...(state.pending || [])] };

  next.cash = state.cash + pnl.profit;
  next.week = state.week + 1;

  // 1. Fire consequences that have come due, before drift, so their effects then drift
  //    like anything else.
  const fired = [];
  const stillPending = [];
  for (const item of next.pending) {
    if (item.dueWeek <= next.week) fired.push(item);
    else stillPending.push(item);
  }
  next.pending = stillPending;
  for (const item of fired) next = applyEffects(next, item.effects);

  // 2. Running past your own hours is not free. You cut corners: the cleaning slips
  //    and service gets worse. This is what makes hiring and delegation matter rather
  //    than just costing money (AGENTS.md section 2 — model delegation).
  const load = ownerLoad(next);
  if (load.overloaded) {
    const over = Math.min(1, (load.used - load.total) / Math.max(1, load.total));
    next.hygiene -= 1 + Math.round(over * 4);
    next.reputation -= Math.round(over * 3);
  }

  // 3. Hygiene feeds reputation.
  if (next.hygiene < 40) next.reputation -= 4;
  else if (next.hygiene > 75) next.reputation += 1;

  next.reputation = Math.max(0, Math.min(100, next.reputation));

  // 4. Reputation pulls demand towards the level it justifies, on a lag.
  //
  // This USED to add (reputation - 50) * 0.6 to demand every week, which compounds:
  // a middling reputation subtracted customers indefinitely and a long run drove
  // demand to zero and stayed there, killing the business with no way back. Moving a
  // fraction of the way towards a reputation-implied target keeps the lag — the point
  // of the mechanic — while giving it a floor and a ceiling. A stall by a bus stand
  // always has some passing trade.
  const base = Math.max(0, next.baseDemand ?? next.demand);
  const target = base * (0.4 + 0.012 * next.reputation);
  next.demand = Math.max(
    Math.round(base * 0.15),
    Math.round(next.demand + (target - next.demand) * 0.25),
  );

  // 5. Baseline decay — standards slip unless maintained. It stops at the level you
  //    hold without trying; going below that takes active neglect, which is what the
  //    overload penalty above represents.
  if (next.hygiene > HYGIENE_FLOOR) next.hygiene -= 1;
  next.hygiene = Math.max(0, Math.min(100, next.hygiene));

  // 6. Reset the owner's week. Hours spent researching THIS week are spent; next week
  //    starts from whatever running the business now takes. Without this reset, hours
  //    accumulate for the whole playthrough and checking your facts — the behaviour the
  //    information-seeking indicator exists to reward — would slowly destroy you.
  next.ownerHoursUsed = baseOwnerHours(next);

  return { state: next, pnl, fired };
}

/**
 * Advance several weeks at once, so a decision can be authored to play out over a
 * month rather than a week (`advanceWeeks` on a turn). Drift compounds across the
 * span, which is what makes slow effects visible instead of theoretical.
 *
 * `pnl` is the FIRST week's — that is the week the reveal is about. `weekly` carries
 * the whole series for the chart.
 */
export function advanceWeeks(state, weeks = 1) {
  const n = Math.max(1, Math.round(weeks));
  let current = state;
  let firstPnl = null;
  const fired = [];
  const weekly = [];

  for (let i = 0; i < n; i += 1) {
    const step = advanceWeek(current);
    if (i === 0) firstPnl = step.pnl;
    fired.push(...step.fired);
    weekly.push({ week: current.week, profit: step.pnl.profit, cash: step.state.cash });
    current = step.state;
  }

  return { state: current, pnl: firstPnl, fired, weekly };
}

/**
 * Where this business is heading if the learner changes nothing.
 *
 * A plain mechanical extrapolation, not a forecast of anything real — it runs the same
 * drift the engine already applies. It exists because the slow variables (hygiene,
 * reputation, owner hours) move too gradually to notice one turn at a time, which is
 * exactly the lesson: small neglect compounds.
 */
export function project(state, weeks = 12) {
  const run = advanceWeeks(state, weeks);
  return {
    weeks,
    cash: run.state.cash,
    cashNow: state.cash,
    profitThen: weeklyPnl(run.state).profit,
    profitNow: weeklyPnl(state).profit,
    weekly: run.weekly,
    endState: run.state,
  };
}

/**
 * The hours running the business takes the owner in a normal week.
 *
 * Rises with output and falls with staff. This is the mechanism behind the founder
 * who cannot build beyond themselves: growing capacity without delegating walks you
 * into an overload you cannot work your way out of.
 */
export function baseOwnerHours(state) {
  const fromOutput = Math.round(state.capacity / 6);
  const relievedByStaff = (state.staff || 0) * 12;
  return Math.max(8, (state.ownerHoursFixed ?? 15) + fromOutput - relievedByStaff);
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

/**
 * Resolve a number decision into the effects consumed by applyEffects.
 *
 * The response curve is deliberately small and declarative: content supplies a
 * per-step distance and a change, and the engine performs the arithmetic here.
 * There is no expression language for scenario content to execute.
 */
export function resolveNumberInput(state, input, value) {
  const effects = {};
  const responseDeltas = {};
  const startValue = input.start === 'current'
    ? Number(state[input.field]) || 0
    : Number(input.start);

  effects[input.field] = value;

  for (const response of input.responses || []) {
    const perStep = Number(response.perStep);
    const change = Number(response.change);
    if (!response.field || !Number.isFinite(perStep) || perStep === 0 || !Number.isFinite(change)) continue;

    const delta = Math.round(((Number(value) - startValue) / perStep) * change);
    responseDeltas[response.field] = (responseDeltas[response.field] || 0) + (Object.is(delta, -0) ? 0 : delta);
  }

  for (const [field, delta] of Object.entries(responseDeltas)) {
    // Numeric state fields in current scenarios are additive. Preserve the
    // applyEffects escape hatch for an absolute field so this API remains
    // additive even if a future curve targets one.
    effects[field] = ADDITIVE.has(field) ? delta : `${delta >= 0 ? '+' : ''}${delta}`;
  }

  return effects;
}

/** Total available to allocate, rounded to the authored step. */
export function allocationTotal(state, allocate) {
  const step = Number(allocate.step);
  if (!Number.isFinite(step) || step <= 0) return 0;

  const amount = Number(state[allocate.amountFrom]);
  const fraction = Number(allocate.fraction);
  if (!Number.isFinite(amount) || !Number.isFinite(fraction)) return 0;

  return Math.max(0, Math.round((amount * fraction) / step) * step);
}

/**
 * Resolve an allocation into additive effects. `split` contains amounts, not
 * units; units are derived from the same authored step as allocationTotal().
 */
export function resolveAllocation(state, allocate, split) {
  const step = Number(allocate.step);
  if (!Number.isFinite(step) || step <= 0) return {};

  const effects = {};
  const deltas = {};
  let keptCash = 0;

  for (const bucket of allocate.buckets || []) {
    const amount = Number(split?.[bucket.id]);
    if (!Number.isFinite(amount)) continue;
    if (bucket.keepsCash) keptCash += amount;

    const units = amount / step;
    for (const [field, perStep] of Object.entries(bucket.perStep || {})) {
      const delta = Number(perStep) * units;
      if (!Number.isFinite(delta)) continue;
      deltas[field] = (deltas[field] || 0) + delta;
    }
  }

  const total = allocationTotal(state, allocate);
  deltas.cash = (deltas.cash || 0) - (total - keptCash);

  for (const [field, delta] of Object.entries(deltas)) {
    const whole = Object.is(delta, -0) ? 0 : delta;
    effects[field] = ADDITIVE.has(field) ? whole : `${whole >= 0 ? '+' : ''}${whole}`;
  }
  return effects;
}

/** Return the first matching band, or the unbounded final band. */
export function bandForValue(bands, value) {
  if (!Array.isArray(bands)) return null;
  let fallback = null;
  for (const band of bands) {
    if (!band || typeof band !== 'object') continue;
    if (!Object.prototype.hasOwnProperty.call(band, 'upTo')) {
      fallback = band;
      continue;
    }
    if (Number(value) <= Number(band.upTo)) return band;
  }
  return fallback;
}

/** Grade a numeric weekly-profit prediction against the actual result. */
export function gradePrediction(predicted, actual) {
  const error = Math.abs(predicted - actual) / Math.max(2000, Math.abs(actual));
  if (error <= 0.10) return { grade: 'close', correct: true, error, predicted, actual };
  if (error <= 0.25) return { grade: 'near', correct: false, error, predicted, actual };
  return { grade: 'off', correct: false, error, predicted, actual };
}

/** How many weeks of current fixed costs current cash covers. */
export function weeksOfCostsCovered(state) {
  const costs = (Number(state.rent) || 0)
    + ((Number(state.staff) || 0) * (Number(state.wagePerStaff) || 0))
    + (Number(state.licenceFees) || 0);
  if (costs <= 0) return 0;
  return Math.max(0, Number(state.cash) || 0) / costs;
}

/** Evaluate declarative goal conditions against the current state. */
export function evaluateGoal(state, goal) {
  const conditions = (goal && Array.isArray(goal.conditions)) ? goal.conditions : [];
  const progress = conditions.map((condition) => {
    let current = 0;
    if (condition.metric === 'weeksOfCostsCovered') current = weeksOfCostsCovered(state);
    else if (condition.field) current = Number(state[condition.field]) || 0;

    const target = Number(condition.min);
    return {
      id: condition.id,
      met: Number.isFinite(target) && current >= target,
      current,
      target: condition.min,
    };
  });
  return {
    conditions: progress,
    metCount: progress.filter((condition) => condition.met).length,
    total: progress.length,
  };
}

/** True when the business needs the recovery chapter. */
export function needsRecovery(state) {
  return state.cash < 0;
}
