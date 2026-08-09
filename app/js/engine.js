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

  // How the owner's week scales with the business. Authored per chapter: an hour per
  // six units and twelve hours relieved per employee are stall figures, and a factory
  // that used them would demand thousands of hours a week (see baseOwnerHours).
  hoursPerCapacity: 1 / 6,
  hoursPerStaff: 12,

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

  // --- chapters 2-4 (ADR-0007, D-017) -------------------------------------
  //
  // Every field below defaults so that a scenario not using it behaves exactly as it
  // did before they existed. Chapter 1 sets none of them, and test-engine.mjs asserts
  // that its ledger and its cash movement are unchanged. If you add a field here, it
  // MUST have a default under which it contributes nothing.

  // Product mix. When null, the flat price/unitCost/demand/capacity fields above are
  // the single implicit line. When set, they are ignored for the P&L and each entry
  // is { id, price, unitCost, demand, capacity }. Contribution margin differs per
  // line, which is the whole point: the line that sells most usually earns least.
  lines: null,

  // A machine wears out in a good week too. Depreciation is a cost with no cash
  // movement, which is half of why profit and cash are different words.
  assetValue: 0,
  assetLifeWeeks: 0,

  // Borrowing. `interestRate` is annual; interest accrues weekly on the outstanding
  // balance and IS a cost. `repayPerWeek` is cash leaving the business and is NOT a
  // cost — that is the other half.
  debt: 0,
  interestRate: 0,
  repayPerWeek: 0,

  // Working capital, in weeks of the flow each applies to. Money owed to you, stock
  // sitting on a shelf, and money you have not yet paid your supplier. While the
  // business is flat these net out to nothing; while it grows they consume cash, and
  // that is what kills a profitable bakery.
  debtorWeeks: 0,
  inventoryWeeks: 0,
  creditorWeeks: 0,

  // An employee costs more than their wage once statutory contributions are in.
  payrollOnCost: 0,

  // Earning in someone else's currency. `fxShare` of revenue is priced abroad at
  // `fxRate`; `fxBase` is the rate that revenue was quoted against, so a move in
  // `fxRate` is a gain or a loss on exactly that share.
  fxShare: 0,
  fxRate: 1,
  fxBase: 1,

  // Landed cost. Applies only to the exported share of what is sold.
  exportShare: 0,
  dutyRate: 0,
  freightPerUnit: 0,

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
// They are also scaled per chapter, because a fixed number of shillings does not mean
// the same thing to a stall and to a bakery. Held at the stall's figures, "up a lot"
// was more than 12,000 on a business earning 20,000 a week — reached once in forty-two
// options in chapter 1 — and the same threshold on a bakery earning 57,000 a week
// swallowed almost everything, leaving "up a little" reached twice in forty-five. Both
// chapters were offering a four-way prediction that behaved as a three-way one, and a
// different three each time. A scenario sets its own edges; the defaults are the
// stall's, so chapter 1 is unchanged (Q-014).
export const BAND_DEFAULTS = { same: 1500, lot: 12000 };

let bands = { ...BAND_DEFAULTS };

/** Set the edges for the loaded chapter. Called alongside setCurrency. */
export function setBands(override) {
  const same = Number(override && override.same);
  const lot = Number(override && override.lot);
  bands = {
    same: same > 0 ? same : BAND_DEFAULTS.same,
    lot: lot > 0 ? lot : BAND_DEFAULTS.lot,
  };
  if (bands.lot <= bands.same) bands.lot = bands.same * 8;
  return bandEdges();
}

/** The edges in force, for labelling each choice with the money it covers (D-015). */
export function bandEdges() {
  return { ...bands };
}

export function bandFor(delta) {
  if (delta < -bands.same) return 'down';
  if (delta <= bands.same) return 'same';
  if (delta <= bands.lot) return 'up_bit';
  return 'up_lot';
}

// Fields where a plain number in `effects` ADDS to the current value.
const ADDITIVE = new Set([
  'cash', 'demand', 'capacity', 'reputation', 'hygiene',
  'ownerHoursUsed', 'ownerHours', 'ownerHoursFixed', 'rent', 'licenceFees',
  'debt', 'assetValue',
]);

// Fields where a plain number REPLACES the current value.
const ABSOLUTE = new Set([
  'price', 'unitCost', 'staff', 'formality', 'wagePerStaff', 'spoilRate', 'week',
  'assetLifeWeeks', 'interestRate', 'repayPerWeek', 'hoursPerCapacity', 'hoursPerStaff',
  'debtorWeeks', 'inventoryWeeks', 'creditorWeeks', 'payrollOnCost',
  'fxShare', 'fxRate', 'fxBase', 'exportShare', 'dutyRate', 'freightPerUnit',
]);

const CLAMPED = {
  reputation: [0, 100],
  hygiene: [0, 100],
  formality: [0, 3],
  // Working capital is authored in weeks. A quarter is already a punishing cycle and
  // an unbounded one lets a single authoring slip consume cash without limit — which
  // is the failure mode D-014 exists to prevent, arriving through a new door.
  debtorWeeks: [0, 26],
  inventoryWeeks: [0, 26],
  creditorWeeks: [0, 26],
  fxShare: [0, 1],
  exportShare: [0, 1],
  dutyRate: [0, 1],
  payrollOnCost: [0, 1],
  interestRate: [0, 2],
};

// Effects may address one product line as `lines.<id>.<field>`.
const LINE_EFFECT = /^lines\.([A-Za-z0-9_-]+)\.([A-Za-z]+)$/;
const LINE_ADDITIVE = new Set(['demand', 'capacity']);

/**
 * The product lines this state sells, always as an array.
 *
 * A scenario that never mentions `lines` has exactly one, built from the flat fields,
 * so every calculation below can be written once against a list.
 */
export function linesOf(state) {
  if (Array.isArray(state.lines) && state.lines.length > 0) return state.lines;
  return [{
    id: 'main',
    price: state.price,
    unitCost: state.unitCost,
    demand: state.demand,
    capacity: state.capacity,
  }];
}

/**
 * Read a state field by the same name an effect would use to write it — including a
 * product line addressed as `lines.<id>.<field>`.
 *
 * This exists because content addresses lines through a path and `state` stores them in
 * an array, so `state['lines.export.price']` is `undefined`. Every caller that wanted
 * "where the learner is now" used the plain index and silently got zero: a `number`
 * decision anchored on `start: "current"` measured its response curve from 0 rather than
 * from the current price, and the stepper opened at its own minimum instead of at the
 * learner's own position — which [D-015](../../memory/DECISIONS.md) calls a
 * data-integrity bug, not a cosmetic one. Chapter 4 turn 4 cost the learner 34–50
 * reputation for naming any price at all; chapter 3 turn 18 wiped roughly 2,000 loaves
 * of demand for holding its own price. Both look like judgement in the record.
 *
 * Returns `undefined` when the field does not exist, so a caller can tell a real zero
 * from a field that was never there. `validate-scenario.mjs` fails a `start: "current"`
 * that lands on one.
 */
export function readField(state, field) {
  const lineMatch = LINE_EFFECT.exec(String(field));
  if (lineMatch) {
    const [, lineId, name] = lineMatch;
    const line = linesOf(state).find((candidate) => candidate.id === lineId);
    return line ? line[name] : undefined;
  }
  return state[field];
}

// The standard an owner holds without effort. Weekly slippage stops here; going below
// takes active neglect (see the overload penalty in advanceWeek).
const HYGIENE_FLOOR = 40;

export function createState(overrides = {}) {
  const state = { ...DEFAULT_STATE, ...overrides };
  state.flags = { ...DEFAULT_STATE.flags, ...(overrides.flags || {}) };
  state.pending = [...(overrides.pending || [])];
  state.lines = Array.isArray(overrides.lines) && overrides.lines.length
    ? overrides.lines.map((line) => ({ ...line }))
    : null;

  // With product lines authored, the flat demand and capacity fields are the totals of
  // those lines. They are what the stats panel, the drift rules and every existing
  // check read, so leaving them at a default would show the learner one business while
  // the ledger described another.
  if (state.lines) {
    const total = (key) => state.lines.reduce((sum, line) => sum + (Number(line[key]) || 0), 0);
    if (!('demand' in overrides)) state.demand = total('demand');
    if (!('capacity' in overrides)) state.capacity = total('capacity');
  }

  // Derive the opening week's load from the opening state, unless content pins it.
  // Otherwise week 1 shows a default that does not match the business on screen.
  if (!('ownerHoursUsed' in overrides)) state.ownerHoursUsed = baseOwnerHours(state);
  if (!('baseDemand' in overrides)) state.baseDemand = state.demand;
  if (!('openingDemand' in overrides)) state.openingDemand = state.demand;
  if (!('openingRent' in overrides)) state.openingRent = state.rent;

  // Settle the opening working-capital balance, so a chapter that starts with credit
  // terms already in place is not charged on its first week for a position it began
  // with. Only changes from here on cost or release cash.
  if (!('wcHeld' in overrides)) state.wcHeld = workingCapital(state);

  return state;
}

/**
 * Weekly profit and loss, derived entirely from state.
 *
 * Spoilage only applies to unsold *made* stock. A learner who builds capacity
 * ahead of demand pays for it — that is the lesson, so it must be real.
 */
export function weeklyPnl(state) {
  // Per line, so contribution margin can differ by product. With no `lines` authored
  // this loop runs exactly once over the flat fields and the arithmetic below is
  // identical to what it was before product mix existed.
  const lines = linesOf(state);
  const perLine = lines.map((line) => {
    const sold = Math.max(0, Math.min(Number(line.demand) || 0, Number(line.capacity) || 0));
    const lineRevenue = sold * (Number(line.price) || 0);
    const lineVariable = sold * (Number(line.unitCost) || 0);
    const unsold = Math.max(0, (Number(line.capacity) || 0) - (Number(line.demand) || 0));
    return {
      id: line.id,
      unitsSold: sold,
      unmetDemand: Math.max(0, (Number(line.demand) || 0) - (Number(line.capacity) || 0)),
      revenue: lineRevenue,
      variableCost: lineVariable,
      contribution: lineRevenue - lineVariable,
      // Reported per line because "which product actually earns" is the lesson, and a
      // blended margin is exactly what hides it.
      margin: lineRevenue > 0 ? (lineRevenue - lineVariable) / lineRevenue : 0,
      spoilage: Math.round(unsold * (Number(line.unitCost) || 0) * (state.spoilRate || 0)),
    };
  });

  const sum = (key) => perLine.reduce((total, line) => total + line[key], 0);
  const unitsSold = sum('unitsSold');
  const revenue = sum('revenue');
  const variableCost = sum('variableCost');
  const spoilage = sum('spoilage');

  // Currency movement lands on the share of revenue that was priced abroad. At the
  // default (`fxShare` 0, rate equal to base) this is exactly zero.
  const fxShare = state.fxShare || 0;
  const fxBase = state.fxBase || 1;
  const fxEffect = fxBase > 0
    ? Math.round(revenue * fxShare * (((state.fxRate || 1) / fxBase) - 1))
    : 0;

  // Landed cost applies only to what is actually exported.
  const exportUnits = Math.round(unitsSold * (state.exportShare || 0));
  const freight = Math.round(exportUnits * (state.freightPerUnit || 0));
  const duty = Math.round(revenue * (state.exportShare || 0) * (state.dutyRate || 0));

  const grossProfit = revenue + fxEffect - variableCost - freight - duty;

  const wages = Math.round(state.staff * state.wagePerStaff * (1 + (state.payrollOnCost || 0)));
  const depreciation = state.assetLifeWeeks > 0
    ? Math.round((state.assetValue || 0) / state.assetLifeWeeks)
    : 0;
  const interest = Math.round(((state.debt || 0) * (state.interestRate || 0)) / 52);

  const fixedCost = state.rent + wages + (state.licenceFees || 0) + depreciation + interest;

  const profit = grossProfit - fixedCost - spoilage;

  return {
    unitsSold,
    unmetDemand: sum('unmetDemand'),
    revenue,
    variableCost,
    grossProfit,
    // Blended contribution margin, kept for every existing caller. `perLine` is what
    // a mix decision should actually be read against.
    margin: revenue > 0 ? grossProfit / revenue : 0,
    wages,
    rent: state.rent,
    licenceFees: state.licenceFees || 0,
    fixedCost,
    spoilage,
    profit,

    // Chapters 2-4. All zero under chapter 1's state.
    perLine,
    fxEffect,
    freight,
    duty,
    depreciation,
    interest,
  };
}

/**
 * Cash tied up in the trading cycle: money customers owe you, plus stock on the
 * shelf, minus money you have not yet paid your suppliers.
 *
 * Expressed in weeks of the flow each applies to, so it moves when the business
 * moves. That is the point — at a standstill it is constant and costs nothing, and
 * growth makes it consume cash faster than the growth earns it.
 */
export function workingCapital(state) {
  const pnl = weeklyPnl(state);
  return Math.round(
    (pnl.revenue * (state.debtorWeeks || 0))
    + (pnl.variableCost * (state.inventoryWeeks || 0))
    - (pnl.variableCost * (state.creditorWeeks || 0)),
  );
}

/**
 * What the business is worth: what it owns, less what it owes.
 *
 * Every figure this game showed a learner before this existed was a FLOW — a week's
 * profit, a week's cash, twelve weeks of profit on a chart. Nothing showed a STOCK, so
 * nothing a learner did could be seen to accumulate, and three things an owner of a real
 * firm lives by could not be taught at all: what the business is worth, how much of it
 * the lender has a claim on, and what their own drawings did to both (D-030).
 *
 * What it counts, and the limits of that:
 *
 *   + cash                what is in the box and the bank
 *   + assetValue          equipment, at what it is worth NOW — it falls with depreciation
 *   + working capital     stock on the shelf and money customers owe, less money owed
 *                         to suppliers. Held in state, so it carries the learner's own
 *                         swings and not a fresh derivation (see workingCapital)
 *   − debt                what is owed to the lender
 *
 * It does NOT count anything content did not record. Capacity bought without an
 * `assetValue` is, to this function, cash that left and nothing that arrived — which is
 * why buying a fryer had to start recording the fryer (D-031). That is a content rule
 * with a warning in validate-scenario.mjs, not something this can defend itself against.
 */
export function netWorth(state) {
  const wc = state.wcHeld ?? workingCapital(state);
  return Math.round(
    (Number(state.cash) || 0)
    + (Number(state.assetValue) || 0)
    + wc
    - (Number(state.debt) || 0),
  );
}

/**
 * How much of the business the lender has a claim on, against how much the owner does.
 *
 * Returned as a share of the owner's stake — `1` means the lender is owed exactly what
 * the owner holds — plus the two figures it came from, so a caller can say it in words
 * rather than as a ratio. `docs/localization.md` asks for a concrete comparison over an
 * abstract ratio, and "for every 100 that is yours, 80 is owed" is one.
 *
 * `owned` is what is left after the debt, which is the same equity `netWorth` reports.
 * When that is zero or less the ratio is meaningless rather than infinite, and the
 * honest thing to say is that the business owes more than it owns — so `share` is null
 * and the caller must handle it.
 */
export function gearing(state) {
  const owed = Number(state.debt) || 0;
  const owned = netWorth(state);
  return {
    owed,
    owned,
    share: owned > 0 ? owed / owned : null,
    // More is owed than the owner holds. Not a failure — a highly geared business is a
    // normal thing — but it is the point at which a bad quarter stops being survivable
    // on the owner's own account.
    outweighed: owed > 0 && owed > owned,
  };
}

/**
 * What actually reaches the bank this week, as opposed to what the business earned.
 *
 * `profit` and `cashFlow` are equal by construction whenever the chapter-2-4 fields
 * are at their defaults — no assets, no debt, no working-capital terms — which is why
 * chapter 1 is untouched by any of this (D-017).
 *
 * `wcChange` is supplied by advanceWeek, which knows the position at both ends of the
 * week. On its own this function reports the movement excluding working capital.
 */
export function weeklyCashFlow(state, wcChange = 0) {
  const pnl = weeklyPnl(state);
  const repayment = Math.min(Number(state.repayPerWeek) || 0, Number(state.debt) || 0);
  return {
    profit: pnl.profit,
    // Depreciation was charged as a cost and no money left the building.
    depreciation: pnl.depreciation,
    repayment,
    workingCapitalChange: wcChange,
    cashFlow: pnl.profit + pnl.depreciation - repayment - wcChange,
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

  // Product lines are cloned before anything can touch them, so a projection cannot
  // write through into the real playthrough — the same trap `pending` was already
  // guarded against above.
  if (Array.isArray(next.lines)) next.lines = next.lines.map((line) => ({ ...line }));
  let touchedLines = false;

  for (const [key, raw] of Object.entries(effects)) {
    // `lines.<id>.<field>` addresses one product. Demand and capacity add; price and
    // unit cost replace — the same split as the flat fields they mirror.
    const lineMatch = LINE_EFFECT.exec(key);
    if (lineMatch && Array.isArray(next.lines)) {
      const [, lineId, field] = lineMatch;
      const line = next.lines.find((candidate) => candidate.id === lineId);
      const amount = Number(raw);
      if (line && Number.isFinite(amount)) {
        line[field] = LINE_ADDITIVE.has(field) || /^[+-]/.test(String(raw))
          ? (Number(line[field]) || 0) + amount
          : amount;
        if (LINE_ADDITIVE.has(field)) line[field] = Math.max(0, Math.round(line[field]));
        else line[field] = Math.max(0, line[field]);
        touchedLines = true;
      }
      continue;
    }

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

  // Costs floor at zero. Content reduces these additively — the recovery chapter cuts
  // rent, for instance — and enough reductions in a row would otherwise take them
  // negative, at which point the business is being paid to exist and the whole ledger
  // stops meaning anything.
  next.rent = Math.max(0, next.rent);
  next.licenceFees = Math.max(0, next.licenceFees || 0);
  next.wagePerStaff = Math.max(0, next.wagePerStaff);
  next.unitCost = Math.max(0, next.unitCost);
  next.price = Math.max(0, next.price);
  next.debt = Math.max(0, next.debt || 0);
  next.assetValue = Math.max(0, next.assetValue || 0);
  next.repayPerWeek = Math.max(0, next.repayPerWeek || 0);
  next.freightPerUnit = Math.max(0, next.freightPerUnit || 0);
  next.fxRate = Math.max(0, next.fxRate ?? 1);

  // A demand change authored in content is structural — a customer won or lost, not a
  // mood swing — so it moves the baseline the weekly reputation drift pulls towards.
  // Without this, winning the hotel contract would be undone over the following weeks.
  //
  // The floor matters: several authored penalties in a row would otherwise take the
  // baseline to nothing and the business could never recover, which is not how a stall
  // by a bus stand behaves however badly it is run. Being reduced to passing trade is
  // the lesson; being erased is just an unwinnable game.
  // Keep the flat totals and the product lines describing the same business.
  //
  // Content addresses one or the other, never both in one effects block. A `lines.*`
  // effect is authoritative and the totals follow it; a flat `demand` or `capacity`
  // effect means "the whole business moved" and is spread across the lines in
  // proportion. Without this the stats panel and the ledger drift apart, each
  // internally consistent and describing different businesses.
  if (Array.isArray(next.lines)) {
    const totalOf = (key) => next.lines.reduce((sum, line) => sum + (Number(line[key]) || 0), 0);

    if (touchedLines) {
      next.demand = totalOf('demand');
      next.capacity = totalOf('capacity');
    } else {
      for (const key of ['demand', 'capacity']) {
        if (next[key] === state[key]) continue;
        const before = totalOf(key);
        if (before <= 0) continue;
        const ratio = next[key] / before;
        next.lines = next.lines.map((line) => ({
          ...line,
          [key]: Math.max(0, Math.round((Number(line[key]) || 0) * ratio)),
        }));
      }
      next.demand = totalOf('demand');
      next.capacity = totalOf('capacity');
    }
  }

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

  // What was already tied up in the trading cycle, carried in state rather than
  // recomputed from `state` here.
  //
  // This matters more than it looks. A decision — agreeing 30-day terms, taking on a
  // wholesale customer — is applied by the caller BEFORE any week passes, so measuring
  // the change from the start of this function would miss exactly the swings the
  // learner caused and catch only the drift. Holding the balance means the
  // reconciliation below picks up every movement since it was last settled, whoever
  // caused it.
  const wcBefore = state.wcHeld ?? workingCapital(state);

  let next = { ...state, flags: { ...state.flags }, pending: [...(state.pending || [])] };
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
  const driftedDemand = Math.max(
    Math.round(base * 0.15),
    Math.round(next.demand + (target - next.demand) * 0.25),
  );

  // With product lines, drift has to reach the lines or it never reaches the ledger:
  // the P&L reads per-line demand and would sit perfectly still while the headline
  // number moved. Reputation is a property of the business, not of one product, so
  // every line moves by the same proportion.
  if (Array.isArray(next.lines) && next.demand > 0) {
    const ratio = driftedDemand / next.demand;
    next.lines = next.lines.map((line) => ({
      ...line,
      demand: Math.max(0, Math.round((Number(line.demand) || 0) * ratio)),
    }));
    next.demand = next.lines.reduce((sum, line) => sum + line.demand, 0);
  } else {
    next.demand = driftedDemand;
  }

  // 5. Baseline decay — standards slip unless maintained. It stops at the level you
  //    hold without trying; going below that takes active neglect, which is what the
  //    overload penalty above represents.
  if (next.hygiene > HYGIENE_FLOOR) next.hygiene -= 1;
  next.hygiene = Math.max(0, Math.min(100, next.hygiene));

  // 5b. Bank the week — and note that what reaches the bank is not what was earned.
  //
  // This line used to read `cash += pnl.profit`, and for chapter 1 it still does: with
  // no assets, no debt and no working-capital terms, `cashFlow` is `profit` exactly
  // (D-017). Everything chapters 2-4 teach about solvency lives in the gap between
  // them, and it is computed here rather than narrated in content.
  //
  // The exchange rate is not drifted here on purpose. A currency move is authored as a
  // scheduled consequence so that when it arrives the learner is told what caused it,
  // like every other delayed effect in this engine.
  const wcAfter = workingCapital(next);
  const flow = weeklyCashFlow(state, wcAfter - wcBefore);

  next.cash = state.cash + flow.cashFlow;
  next.wcHeld = wcAfter;
  next.debt = Math.max(0, (next.debt || 0) - flow.repayment);
  // The asset wears down by exactly what was charged for it, so depreciation stops
  // when the machine is written off instead of running forever.
  next.assetValue = Math.max(0, (next.assetValue || 0) - pnl.depreciation);
  if (next.assetValue === 0) next.assetLifeWeeks = 0;

  // 6. Insolvency sheds what you can no longer pay for.
  //
  // Without this, weekly costs compound forever: a learner who buys everything on
  // credit keeps paying rent on a fryer that would have been repossessed months ago,
  // and cash runs to figures that make the ledger read as broken rather than as a
  // business in trouble. Losing what you cannot fund is both what actually happens and
  // what bounds the spiral — fixed costs fall as the business shrinks, so the hole stops
  // deepening. It shrinks towards a stall, never to nothing (docs/game-design.md:
  // failure is a chapter boundary, not an ending).
  if (next.cash < 0) {
    const openingRent = next.openingRent ?? state.rent;
    if (next.rent > openingRent) next.rent = Math.max(openingRent, Math.round(next.rent * 0.85));
    if (next.staff > 0 && -next.cash > next.wagePerStaff * 4) next.staff -= 1;
    if (next.licenceFees > 0) next.licenceFees = Math.round(next.licenceFees * 0.85);

    const capacityFloor = Math.max(60, Math.round((next.openingDemand ?? 180) * 0.5));
    if (next.capacity > capacityFloor) {
      const shrunk = Math.max(capacityFloor, Math.round(next.capacity * 0.9));
      // One ratio, applied everywhere. The floor used to be applied to the total while
      // the lines were shrunk by a flat 0.9 and the total was never recomputed from
      // them — so in any chapter with a product mix the lines kept shrinking past the
      // floor week after week and the business could be driven to a state it could
      // never leave, which is exactly what D-014 exists to prevent.
      const ratio = next.capacity > 0 ? shrunk / next.capacity : 1;
      // Equipment goes with the capacity it provided, so the depreciation charge falls
      // alongside it rather than being paid on a machine that is no longer there.
      if (next.assetValue > 0) next.assetValue = Math.round(next.assetValue * ratio);
      if (Array.isArray(next.lines)) {
        next.lines = next.lines.map((line) => ({
          ...line,
          capacity: Math.max(0, Math.round((Number(line.capacity) || 0) * ratio)),
        }));
        next.capacity = next.lines.reduce((sum, line) => sum + line.capacity, 0);
      } else {
        next.capacity = shrunk;
      }
    }

    // A business that cannot pay does not keep servicing a loan on the original terms.
    // Without this, `repayPerWeek` drains cash for the rest of the run at a rate
    // nothing can reduce — the same unbounded-cost failure D-014 was written for,
    // arriving through the financing fields instead of the operating ones.
    if (next.repayPerWeek > 0 && -next.cash > next.repayPerWeek * 4) {
      next.repayPerWeek = Math.round(next.repayPerWeek * 0.85);
    }

    // Chasing your debtors is the first thing anyone does when the money runs out, and
    // it releases cash. It also bounds the working-capital drain.
    if (next.debtorWeeks > 0) next.debtorWeeks = Math.max(0, next.debtorWeeks - 0.25);
  }

  // 7. Reset the owner's week. Hours spent researching THIS week are spent; next week
  //    starts from whatever running the business now takes. Without this reset, hours
  //    accumulate for the whole playthrough and checking your facts — the behaviour the
  //    information-seeking indicator exists to reward — would slowly destroy you.
  next.ownerHoursUsed = baseOwnerHours(next);

  return { state: next, pnl, fired, flow };
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
  // The rate was fixed at one hour per six units, which is right for a stall and
  // absurd at factory volumes — 15,000 loaves would demand 2,500 hours a week. It is
  // authored per chapter now, because the whole point of scale is that the hours per
  // unit fall. Both defaults reproduce the original numbers exactly, so chapter 1 is
  // untouched.
  const perUnit = Number.isFinite(state.hoursPerCapacity) ? state.hoursPerCapacity : 1 / 6;
  const perStaff = Number.isFinite(state.hoursPerStaff) ? state.hoursPerStaff : 12;

  const fromOutput = Math.round(state.capacity * perUnit);
  const relievedByStaff = (state.staff || 0) * perStaff;
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

  // The chapter 2 and 3 killer, and the one an owner reading only the profit line
  // never sees coming: trading profitably straight into an empty account.
  const flow = weeklyCashFlow(state, 0);
  if (pnl.profit > 0 && flow.cashFlow < 0) problems.push('profitable-but-cash-negative');
  if ((state.debt || 0) > 0 && pnl.profit > 0 && pnl.profit < flow.repayment) {
    problems.push('debt-service-strain');
  }
  return problems;
}

/**
 * The cash conversion cycle, in weeks: how long money is out of your hands between
 * paying for an input and being paid for what you made from it.
 *
 * Reported rather than scored. It is the number chapter 3 is built around, and it is
 * authored directly, so this is a convenience for content and the goal evaluator
 * rather than a derivation.
 */
export function cashCycleWeeks(state) {
  return (Number(state.debtorWeeks) || 0)
    + (Number(state.inventoryWeeks) || 0)
    - (Number(state.creditorWeeks) || 0);
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
    ? Number(readField(state, input.field)) || 0
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

/**
 * Every weekly profit this turn's decision could produce, whichever way the learner
 * decided it. Used to size the prediction stepper: a window that cannot contain the
 * true answer marks a learner wrong for reasoning correctly.
 *
 * The range covers the whole decision space, not the option actually taken, so it
 * says nothing about which outcome is coming.
 */
export function decisionOutcomes(state, turn) {
  const decision = (turn && turn.decision) || {};
  const type = decision.type || 'choice';
  const profitOf = (effects) => weeklyPnl(applyEffects(state, effects)).profit;
  const profits = [];

  if (type === 'number' && decision.input) {
    const { min, max, step } = decision.input;
    const size = Math.max(1, Number(step) || 1);
    let value = Number(min);
    for (; value <= Number(max); value += size) {
      profits.push(profitOf(resolveNumberInput(state, decision.input, value)));
    }
    // An authored range need not be a whole number of steps; the top of it is still a
    // value the learner can commit, so it has to be in the range predictions must cover.
    if (value - size !== Number(max)) {
      profits.push(profitOf(resolveNumberInput(state, decision.input, Number(max))));
    }
  } else if (type === 'allocate' && decision.allocate) {
    // Corners only: an allocation's effects are linear in each bucket, so the extremes
    // bound everything between them.
    const buckets = decision.allocate.buckets || [];
    const total = allocationTotal(state, decision.allocate);
    for (const bucket of buckets) {
      profits.push(profitOf(resolveAllocation(state, decision.allocate, { [bucket.id]: total })));
    }
  } else {
    for (const option of decision.options || []) profits.push(profitOf(option.effects || {}));
  }

  return profits.filter((profit) => Number.isFinite(profit));
}

const STEP_LADDER = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];

function niceStep(span) {
  const target = span / 20;
  return STEP_LADDER.find((candidate) => candidate >= target) || STEP_LADDER[STEP_LADDER.length - 1];
}

/**
 * The range and granularity for a numeric profit prediction.
 *
 * Anchored on the current profit and widened to hold every outcome the decision could
 * produce, plus half that spread again as headroom so the truth is never at the edge.
 * The step is a round number, roughly a twentieth of the window, so reaching any value
 * is a handful of presses on a phone.
 */
export function predictionWindow(state, turn) {
  const current = weeklyPnl(state).profit;
  const profits = [current, ...decisionOutcomes(state, turn)];
  const floor = Math.max(1, Number(turn?.decision?.predictStep) || 1000) * 5;

  const spread = Math.max(...profits) - Math.min(...profits);
  const reach = Math.max(
    floor,
    Math.max(...profits) - current + (spread / 2),
    current - Math.min(...profits) + (spread / 2),
  );
  const step = niceStep(reach * 2);
  const bound = Math.ceil(reach / step) * step;

  return { min: current - bound, max: current + bound, step, start: current };
}

/**
 * Grade a numeric weekly-profit prediction against the actual result.
 *
 * `granularity` is the stepper's step: a learner who lands on the nearest value the
 * control can reach must be able to score `close`, or the grade measures the control
 * rather than the reasoning.
 */
export function gradePrediction(predicted, actual, granularity = 0) {
  const scale = Math.max(2000, Math.abs(actual));
  const error = Math.abs(predicted - actual) / scale;
  // Half a step is the best any learner can do when the truth falls between two values
  // the control can reach; a little over half keeps that landing inside `close`.
  const slack = ((Number(granularity) || 0) * 0.6) / scale;
  if (error <= 0.10 + slack) return { grade: 'close', correct: true, error, predicted, actual };
  if (error <= 0.25 + slack) return { grade: 'near', correct: false, error, predicted, actual };
  return { grade: 'off', correct: false, error, predicted, actual };
}

/** How many weeks of current fixed costs current cash covers. */
export function weeksOfCostsCovered(state) {
  // Loan repayments belong here: they are as unavoidable as rent, and a runway figure
  // that ignores them tells a borrowing business it has months when it has weeks.
  const costs = (Number(state.rent) || 0)
    + ((Number(state.staff) || 0) * (Number(state.wagePerStaff) || 0) * (1 + (Number(state.payrollOnCost) || 0)))
    + (Number(state.licenceFees) || 0)
    + Math.min(Number(state.repayPerWeek) || 0, Number(state.debt) || 0);
  if (costs <= 0) return 0;
  return Math.max(0, Number(state.cash) || 0) / costs;
}

/** Evaluate declarative goal conditions against the current state. */
export function evaluateGoal(state, goal) {
  const conditions = (goal && Array.isArray(goal.conditions)) ? goal.conditions : [];
  const progress = conditions.map((condition) => {
    let current = 0;
    if (condition.metric === 'weeksOfCostsCovered') current = weeksOfCostsCovered(state);
    else if (condition.metric === 'weeklyProfit') current = weeklyPnl(state).profit;
    else if (condition.metric === 'weeklyCashFlow') current = weeklyCashFlow(state, 0).cashFlow;
    else if (condition.metric === 'contributionMargin') current = weeklyPnl(state).margin;
    else if (condition.metric === 'cashCycleWeeks') current = cashCycleWeeks(state);
    else if (condition.field) current = Number(state[condition.field]) || 0;

    // A condition may set a ceiling instead of a floor. The cash cycle is the obvious
    // case: shorter is the achievement, and `min` cannot express that.
    const target = Number(condition.max ?? condition.min);
    const met = Number.isFinite(target)
      && (condition.max !== undefined ? current <= target : current >= target);

    return {
      id: condition.id,
      met,
      current,
      target: condition.max ?? condition.min,
      direction: condition.max !== undefined ? 'atMost' : 'atLeast',
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
