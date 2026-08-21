// Headless checks for the simulation engine and the behavioural record.
//
// No test framework — this project has no toolchain yet (D-001) and adding one for
// a proof of concept would be premature. Run: node scripts/test-engine.mjs

import { readFileSync } from 'node:fs';
import {
  createState, applyEffects, weeklyPnl, advanceWeek, advanceWeeks, ownerLoad, healthCheck,
  scheduleLater, project, baseOwnerHours, bandFor, setBands, bandEdges, BAND_DEFAULTS,
  resolveNumberInput, resolveAllocation, allocationTotal, bandForValue, gradePrediction,
  weeksOfCostsCovered, evaluateGoal, needsRecovery, predictionWindow, decisionOutcomes,
  linesOf, workingCapital, weeklyCashFlow, cashCycleWeeks, readField, netWorth, gearing,
} from '../app/js/engine.js';
import * as record from '../app/js/record.js';
import { applyCarryIn, collectCarry, situationFor, CARRY_FLAGS } from '../app/js/carry.js';

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function eq(name, actual, expected) {
  check(name, actual === expected, `expected ${expected}, got ${actual}`);
}

console.log('\nengine: weekly P&L');
{
  const s = createState({
    price: 500, unitCost: 300, demand: 200, capacity: 180,
    rent: 20000, staff: 0, spoilRate: 0.5,
  });
  const p = weeklyPnl(s);
  eq('sells the lesser of demand and capacity', p.unitsSold, 180);
  eq('unmet demand is visible', p.unmetDemand, 20);
  eq('revenue', p.revenue, 90000);
  eq('variable cost', p.variableCost, 54000);
  eq('no spoilage when capacity < demand', p.spoilage, 0);
  eq('profit = 90000 - 54000 - 20000', p.profit, 16000);
}

console.log('\nengine: spoilage punishes capacity ahead of demand');
{
  const s = createState({ price: 500, unitCost: 300, demand: 100, capacity: 200, rent: 20000, spoilRate: 0.5 });
  const p = weeklyPnl(s);
  eq('sells only what is demanded', p.unitsSold, 100);
  eq('spoilage on the unsold 100 at half rate', p.spoilage, 15000);
  check('building capacity ahead of demand hurts', p.profit < 15000, `profit ${p.profit}`);
}

console.log('\nengine: wages are a real fixed cost');
{
  const base = createState({ price: 500, unitCost: 300, demand: 200, capacity: 180, rent: 20000 });
  const hired = applyEffects(base, { staff: 1, capacity: 60 });
  const before = weeklyPnl(base).profit;
  const after = weeklyPnl(hired).profit;
  check('hiring raises capacity', hired.capacity === 240, `capacity ${hired.capacity}`);
  check('but profit does not automatically rise', after < before || after > before,
    'sanity: profit changed');
  // With demand 200 and capacity 240 there is now spoilage plus a wage bill.
  check('over-hiring can reduce profit', after < before, `before ${before}, after ${after}`);
}

console.log('\nengine: applyEffects semantics');
{
  const s = createState({ cash: 100000, price: 500, demand: 200, reputation: 50 });
  const a = applyEffects(s, { price: 600 });
  eq('price is absolute', a.price, 600);
  const b = applyEffects(s, { demand: -40 });
  eq('demand is additive', b.demand, 160);
  const c = applyEffects(s, { cash: -25000 });
  eq('cash is additive', c.cash, 75000);
  const d = applyEffects(s, { reputation: 999 });
  eq('reputation clamps at 100', d.reputation, 100);
  const e = applyEffects(s, { reputation: -999 });
  eq('reputation clamps at 0', e.reputation, 0);
  const f = applyEffects(s, { keepsRecords: true });
  eq('booleans set known fields', f.keepsRecords, true);
  const g = applyEffects(s, { metQualityStandard: true });
  eq('unknown keys land in flags', g.flags.metQualityStandard, true);
  const h = applyEffects(s, { price: '-50' });
  eq('string sign forces additive on an absolute field', h.price, 450);
}

console.log('\nengine: a week passing');
{
  const s = createState({ price: 500, unitCost: 300, demand: 200, capacity: 180, rent: 20000, cash: 50000, hygiene: 30, reputation: 50 });
  const { state: next, pnl } = advanceWeek(s);
  eq('week advances', next.week, 2);
  eq('profit is banked to cash', next.cash, 50000 + pnl.profit);
  check('poor hygiene erodes reputation', next.reputation < 50, `reputation ${next.reputation}`);

  // Slippage stops at the standard an owner holds without effort. Below that it takes
  // active neglect, which is what overload models — otherwise hygiene walks to zero on
  // any long run and every late turn happens in a business that is already dead.
  const kept = createState({ hygiene: 70, capacity: 180 });
  check('hygiene slips when it is above the floor', advanceWeek(kept).state.hygiene < 70,
    `hygiene ${advanceWeek(kept).state.hygiene}`);

  let low = createState({ hygiene: 42, capacity: 180 });
  for (let i = 0; i < 10; i += 1) low = advanceWeek(low).state;
  check('but it settles rather than reaching zero', low.hygiene >= 40, `hygiene ${low.hygiene}`);
}

console.log('\nengine: costs cannot go negative');
{
  // The recovery chapter cuts rent additively, and enough cuts in a row used to take it
  // below zero — at which point the business is paid to exist and the ledger is fiction.
  let s = createState({ rent: 20000, licenceFees: 5000 });
  for (let i = 0; i < 4; i += 1) s = applyEffects(s, { rent: '-10000', licenceFees: '-3000' });
  eq('rent floors at zero', s.rent, 0);
  eq('licence fees floor at zero', s.licenceFees, 0);
  check('so weekly fixed cost is never negative', weeklyPnl(s).fixedCost >= 0,
    `fixedCost ${weeklyPnl(s).fixedCost}`);

  const p = applyEffects(createState({ price: 500, unitCost: 300 }), { price: '-900', unitCost: '-900' });
  check('price and unit cost floor at zero', p.price === 0 && p.unitCost === 0, `${p.price}/${p.unitCost}`);
}

console.log('\nengine: insolvency sheds what cannot be paid for');
{
  // A learner who buys everything on credit used to keep paying rent forever on
  // equipment that would have been repossessed, and cash ran to figures that made the
  // ledger read as broken rather than as a business in trouble.
  // `openingRent` is the overhead the business always had; anything above it was taken
  // on with the equipment and is what gets lost. Rent that was always yours is your
  // pitch, not credit, so a business whose rent has never risen sheds nothing.
  const indebted = createState({
    cash: -200000, rent: 90000, openingRent: 20000, capacity: 600, staff: 2, licenceFees: 9000,
  });
  const after = advanceWeek(indebted).state;

  check('rent falls when you cannot pay it', after.rent < 90000, `rent ${after.rent}`);
  check('but not below the overhead you always had', after.rent >= 20000, `rent ${after.rent}`);
  check('capacity shrinks with it', after.capacity < 600, `capacity ${after.capacity}`);
  check('staff you cannot pay are let go', after.staff < 2, `staff ${after.staff}`);

  // It must settle at a small business, not vanish, and the hole must stop deepening.
  let s = createState({ cash: -200000, rent: 90000, openingRent: 20000, capacity: 600, staff: 2 });
  const firstDrop = s.cash - advanceWeek(s).state.cash;
  for (let i = 0; i < 30; i += 1) s = advanceWeek(s).state;
  check('costs settle rather than collapsing to nothing', s.rent >= 0 && s.capacity >= 60,
    `rent ${s.rent}, capacity ${s.capacity}`);
  const lateDrop = s.cash - advanceWeek(s).state.cash;
  check('and the hole stops deepening as fast as it did', lateDrop <= firstDrop,
    `first ${Math.round(firstDrop)}, late ${Math.round(lateDrop)}`);

  const solvent = createState({ cash: 100000, rent: 90000, capacity: 600, staff: 2 });
  eq('a solvent business sheds nothing', advanceWeek(solvent).state.rent, 90000);
}

console.log('\nengine: reputation pulls demand with a lag');
{
  const good = createState({ reputation: 90, hygiene: 80, demand: 200 });
  const bad = createState({ reputation: 10, hygiene: 80, demand: 200 });
  const g = advanceWeek(good).state;
  const b = advanceWeek(bad).state;
  check('good reputation grows demand', g.demand > 200, `demand ${g.demand}`);
  check('bad reputation shrinks demand', b.demand < 200, `demand ${b.demand}`);
}

console.log('\nengine: owner time and health');
{
  const s = createState({ ownerHours: 60, ownerHoursUsed: 75 });
  check('overload is detected', ownerLoad(s).overloaded === true);
  const sick = createState({ cash: -100, hygiene: 20, ownerHours: 60, ownerHoursUsed: 80 });
  const problems = healthCheck(sick);
  check('flags negative cash', problems.includes('cash-negative'));
  check('flags hygiene risk', problems.includes('hygiene-risk'));
  check('flags owner overload', problems.includes('owner-overloaded'));
}

console.log('\nengine: prediction bands');
{
  const { same: BAND_SAME, lot: BAND_LOT } = setBands(null);
  eq('an unset chapter gets the stall\'s edges', BAND_SAME, BAND_DEFAULTS.same);
  eq('a big drop is "down"', bandFor(-20000), 'down');
  eq('just below the same-band edge is "down"', bandFor(-BAND_SAME - 1), 'down');
  eq('no change is "same"', bandFor(0), 'same');
  eq('the same-band edge is still "same"', bandFor(BAND_SAME), 'same');
  eq('just above it is "up a little"', bandFor(BAND_SAME + 1), 'up_bit');
  eq('the up-a-lot edge is still "up a little"', bandFor(BAND_LOT), 'up_bit');
  eq('past it is "up a lot"', bandFor(BAND_LOT + 1), 'up_lot');
}

console.log('\nengine: prediction bands scale to the chapter');
{
  // A fixed number of shillings does not mean the same thing to a stall and to a
  // bakery. Held at the stall's figures, one chapter never reached "up a lot" and the
  // other never reached "up a little" (Q-014).
  setBands({ same: 8000, lot: 50000 });
  eq('the chapter\'s own same-edge holds', bandFor(8000), 'same');
  eq('past it is "up a little"', bandFor(8001), 'up_bit');
  eq('what a stall would have called "up a lot" is "up a little" here', bandFor(20000), 'up_bit');
  eq('and the chapter\'s own lot-edge holds', bandFor(50001), 'up_lot');
  eq('the edges are readable, so the app can label them', bandEdges().lot, 50000);

  setBands({ same: 9000, lot: 1000 });
  eq('an inverted pair does not make "up a little" unreachable', bandEdges().lot > 9000, true);

  setBands(null);
  eq('and it resets to the stall for a chapter that names none', bandEdges().same, BAND_DEFAULTS.same);
}

console.log('\nengine: number inputs and declarative response curves');
{
  const state = createState({ price: 500, demand: 200 });
  const input = {
    field: 'price',
    min: 300,
    max: 900,
    step: 25,
    start: 'current',
    responses: [{ field: 'demand', perStep: 25, change: -12 }],
  };
  const atMin = resolveNumberInput(state, input, input.min);
  const atMax = resolveNumberInput(state, input, input.max);
  eq('number input sets the chosen field at min', atMin.price, 300);
  eq('number input response at min is additive', atMin.demand, 96);
  eq('number input sets the chosen field at max', atMax.price, 900);
  eq('number input response at max is additive', atMax.demand, -192);
  eq('number input does not mutate state', state.price, 500);
  eq('number input effects apply to state', applyEffects(state, atMax).demand, 8);
}

console.log('\nengine: a number input anchored on a product line');
{
  // Content addresses a line as `lines.<id>.<field>`, and `state` holds lines in an
  // array — so `state['lines.bread.price']` is undefined and every "where am I now?"
  // read used to come back as zero. A response curve measured from zero charged the
  // learner the whole price as if it were a change: chapter 4 turn 4 cost 34–50
  // reputation for naming any price, and chapter 3 turn 18 wiped ~2,000 loaves of
  // demand for holding its own price steady. Both graded as the learner's judgement.
  const state = createState({
    lines: [{ id: 'bread', price: 900, unitCost: 600, demand: 500, capacity: 500 }],
  });
  const input = {
    field: 'lines.bread.price',
    min: 700,
    max: 1100,
    step: 25,
    start: 'current',
    responses: [{ field: 'lines.bread.demand', perStep: 25, change: -60 }],
  };

  eq('readField reaches into a product line', readField(state, 'lines.bread.price'), 900);
  eq('readField still reads a flat field', readField(state, 'cash'), state.cash);
  eq('readField reports a field that is not there', readField(state, 'lines.cake.price'), undefined);
  eq('readField reports an unknown line', readField(state, 'lines.nope.price'), undefined);

  const held = resolveNumberInput(state, input, 900);
  eq('holding the current price moves demand not at all', held['lines.bread.demand'], '+0');

  const cut = resolveNumberInput(state, input, 700);
  eq('cutting the price wins customers', cut['lines.bread.demand'], '+480');
  eq('and it is measured from the price, not from zero',
    applyEffects(state, cut).lines[0].demand, 980);
}

console.log('\nengine: allocation inputs');
{
  const state = createState({ cash: 150000, capacity: 180, demand: 200 });
  const allocate = {
    amountFrom: 'cash',
    fraction: 0.6,
    step: 10000,
    buckets: [
      { id: 'business', perStep: { capacity: 8, demand: 5 } },
      { id: 'home', perStep: {} },
      { id: 'reserve', perStep: {}, keepsCash: true },
    ],
  };
  eq('allocation total is rounded to step', allocationTotal(state, allocate), 90000);
  eq('zero cash gives zero allocation', allocationTotal(createState({ cash: 0 }), allocate), 0);

  const zero = resolveAllocation(createState({ cash: 0 }), allocate, { business: 0, home: 0, reserve: 0 });
  eq('zero allocation has zero capacity effect', zero.capacity, 0);
  eq('zero allocation has zero cash effect', zero.cash, 0);

  const allBusiness = resolveAllocation(state, allocate, { business: 90000, home: 0, reserve: 0 });
  const afterBusiness = applyEffects(state, allBusiness);
  eq('allocating everything applies business units', afterBusiness.capacity, 252);
  eq('allocating everything applies demand units', afterBusiness.demand, 245);
  eq('cash falls by non-reserve allocation', afterBusiness.cash, 60000);

  const allReserve = applyEffects(state, resolveAllocation(state, allocate, {
    business: 0, home: 0, reserve: 90000,
  }));
  eq('a keepsCash bucket leaves cash available', allReserve.cash, 150000);
}

console.log('\nengine: value bands and numeric prediction grades');
{
  const bands = [
    { id: 'low', upTo: 0.25 },
    { id: 'middle', upTo: 0.75 },
    { id: 'high' },
  ];
  eq('value band includes its lower boundary', bandForValue(bands, 0.25).id, 'low');
  eq('value band selects the next range', bandForValue(bands, 0.26).id, 'middle');
  eq('value band uses the unbounded fallback', bandForValue(bands, 1).id, 'high');
  eq('value band returns null without a match', bandForValue([{ upTo: 0.5 }], 1), null);

  eq('prediction exactly at close boundary is close', gradePrediction(11000, 10000).grade, 'close');
  eq('prediction just beyond close boundary is near', gradePrediction(11001, 10000).grade, 'near');
  eq('prediction exactly at near boundary is near', gradePrediction(12500, 10000).grade, 'near');
  eq('prediction just beyond near boundary is off', gradePrediction(12501, 10000).grade, 'off');
  check('close prediction is marked correct', gradePrediction(11000, 10000).correct === true);
  check('grade result keeps numeric inputs', gradePrediction(11000, 10000).predicted === 11000);

  // The stepper's granularity is part of the grade: a learner cannot answer more
  // precisely than the control lets them.
  eq('a coarse step widens close', gradePrediction(12000, 10000, 5000).grade, 'close');
  eq('granularity does not make everything close', gradePrediction(20000, 10000, 5000).grade, 'off');
  eq('zero granularity grades as before', gradePrediction(11001, 10000, 0).grade, 'near');
}

console.log('\nengine: the prediction window holds every outcome it could have');
{
  const state = createState();
  const priceTurn = {
    decision: {
      type: 'number',
      predict: 'number',
      input: { field: 'price', min: 500, max: 650, step: 25, start: 'current', responses: [{ field: 'demand', perStep: 25, change: -9 }] },
    },
  };

  const outcomes = decisionOutcomes(state, priceTurn);
  const window = predictionWindow(state, priceTurn);
  check('every price produces a profit', outcomes.length === 7 && outcomes.every(Number.isFinite));
  check(
    'the window contains every outcome the decision could produce',
    outcomes.every((profit) => profit >= window.min && profit <= window.max),
    `window ${window.min}..${window.max}, outcomes ${outcomes.join(', ')}`,
  );
  eq('the window starts at the current profit', window.start, weeklyPnl(state).profit);
  check('the window is centred on the current profit', (window.min + window.max) / 2 === window.start);
  check('the step is a round number', [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000].includes(window.step));
  check('the window is a handful of steps wide', (window.max - window.min) / window.step <= 40);

  // The failure this exists to prevent: the first turn's true answer used to sit
  // outside a fixed ten-step window, so a learner who reasoned correctly was graded off.
  const best = Math.round((Math.max(...outcomes) - window.start) / window.step) * window.step + window.start;
  eq(
    'the best reachable answer for the best outcome is close',
    gradePrediction(best, Math.max(...outcomes), window.step).grade,
    'close',
  );

  const choiceTurn = { decision: { predict: 'number', options: [{ effects: { rent: '+10000' } }, { effects: {} }] } };
  check('a choice turn is covered too', decisionOutcomes(state, choiceTurn).length === 2);
}

console.log('\nengine: costs, goals, and recovery');
{
  const state = createState({ cash: 180000, rent: 20000, staff: 2, wagePerStaff: 30000, licenceFees: 10000 });
  eq('weeks of fixed costs covered', weeksOfCostsCovered(state), 2);
  const empty = evaluateGoal(state, { conditions: [] });
  eq('empty goal has zero conditions', empty.total, 0);
  const complete = evaluateGoal(state, {
    conditions: [
      { id: 'cash', field: 'cash', min: 180000 },
      { id: 'runway', metric: 'weeksOfCostsCovered', min: 2 },
    ],
  });
  eq('all goal conditions can be met', complete.metCount, 2);
  check('goal reports each condition as met', complete.conditions.every((condition) => condition.met));
  check('negative cash needs recovery', needsRecovery(createState({ cash: -1 })) === true);
  check('non-negative cash does not need recovery', needsRecovery(createState({ cash: 0 })) === false);
}

console.log('\nengine: owner hours are a weekly load, not a lifetime total');
{
  const small = createState({ capacity: 180, staff: 0 });
  const big = createState({ capacity: 420, staff: 0 });
  const staffed = createState({ capacity: 420, staff: 2 });

  check('growing output costs the owner more hours', baseOwnerHours(big) > baseOwnerHours(small),
    `${baseOwnerHours(small)} vs ${baseOwnerHours(big)}`);
  check('growing without delegating overloads the owner', ownerLoad(big).overloaded === true,
    `${baseOwnerHours(big)}h of ${big.ownerHours}`);
  check('staff relieve the owner', baseOwnerHours(staffed) < baseOwnerHours(big),
    `${baseOwnerHours(staffed)} vs ${baseOwnerHours(big)}`);
  check('two staff are not quite enough at this output', ownerLoad(staffed).overloaded === true,
    `${baseOwnerHours(staffed)}h of ${staffed.ownerHours}`);
  check('enough delegation resolves it',
    ownerLoad(createState({ capacity: 420, staff: 3 })).overloaded === false,
    `${baseOwnerHours(createState({ capacity: 420, staff: 3 }))}h`);

  // The regression this guards: hours used to accumulate for the whole playthrough, so
  // checking your facts — the behaviour informationSeeking() exists to reward — would
  // have slowly destroyed the learner once overload started to bite.
  const researched = { ...small, ownerHoursUsed: small.ownerHoursUsed + 30 };
  const afterWeek = advanceWeek(researched).state;
  eq('research hours do not carry into next week', afterWeek.ownerHoursUsed, baseOwnerHours(afterWeek));
  check('so a researcher is not permanently overloaded', ownerLoad(afterWeek).overloaded === false);
}

console.log('\nengine: overload has a delayed cost');
{
  const overloaded = createState({ capacity: 420, staff: 0, hygiene: 70, reputation: 60 });
  const delegated = applyEffects(overloaded, { staff: 2 });

  const a = advanceWeeks(overloaded, 4).state;
  const b = advanceWeeks(delegated, 4).state;

  check('running past your hours erodes hygiene', a.hygiene < b.hygiene, `${a.hygiene} vs ${b.hygiene}`);
  check('and eventually reputation', a.reputation < b.reputation, `${a.reputation} vs ${b.reputation}`);
  check('which finally reaches demand', a.demand < b.demand, `${a.demand} vs ${b.demand}`);
}

console.log('\nengine: consequences arrive later, and say what caused them');
{
  let s = createState({ hygiene: 70 });
  s = scheduleLater(s, [{
    inWeeks: 3,
    effects: { hygiene: -25 },
    cause: 'the cheap oil you bought',
  }]);

  eq('nothing fires immediately', advanceWeek(s).fired.length, 0);

  const run = advanceWeeks(s, 4);
  eq('it fires once, in its week', run.fired.length, 1);
  eq('and it carries its cause', run.fired[0].cause, 'the cheap oil you bought');
  check('the effect actually lands', run.state.hygiene < 45, `hygiene ${run.state.hygiene}`);
  eq('and it does not fire twice', advanceWeeks(run.state, 4).fired.length, 0);
}

console.log('\nengine: projecting ahead does not disturb the real run');
{
  let s = createState({ hygiene: 70 });
  s = scheduleLater(s, [{ inWeeks: 2, effects: { hygiene: -30 }, cause: 'x' }]);
  const before = s.pending.length;

  const proj = project(s, 12);
  eq('the scheduled consequence is still queued', s.pending.length, before);
  eq('the real state is untouched', s.hygiene, 70);
  eq('the projection reports where it started', proj.cashNow, s.cash);
  check('and covers the weeks asked for', proj.weekly.length === 12, `${proj.weekly.length}`);
}

console.log('\nrecord: observations and indicators');
{
  const r = record.createRecord('test');
  record.observeInfoSought(r, 't01', 'i1', 'Count customers');
  record.observePrediction(r, 't01', 'up_bit', 'up_bit', true, 'profit');
  record.observeDecision(r, 't01', 'unit-economics', 'a', 'Raise price', 1, 10000, 14000);
  record.observePrediction(r, 't02', 'up_lot', 'down', false, 'profit');
  record.observeDecision(r, 't02', 'pricing', 'b', 'Buy more stock', 0, 14000, 9000);
  record.observeDecision(r, 't03', 'operations', 'c', 'Cut back', 0, 9000, 11000);

  const cal = record.calibration(r);
  eq('counts predictions', cal.total, 2);
  eq('counts correct predictions', cal.correct, 1);
  check('calibration cites its evidence', cal.evidence.length === 2);

  const info = record.informationSeeking(r);
  eq('counts decisions', info.total, 3);
  eq('counts decisions preceded by information', info.withInfo, 1);

  const rec = record.recovery(r);
  eq('detects the profit drop', rec.total, 1);
  eq('records what came next', rec.evidence[0].nextChoice, 'Cut back');

  const cov = record.conceptCoverage(r);
  eq('counts distinct concepts', cov.total, 3);
}

console.log('\nrecord: numeric inputs and diagnosis evidence');
{
  const r = record.createRecord('test');
  record.observePrediction(r, 't01', 11000, 10000, true, 'profit', { error: 0.1, grade: 'close' });
  record.observeDiagnosis(r, 't11', 'pnl.sales', 'pnl.spoilage', false);
  record.observeInput(r, 't01', 'price', 300);
  const json = JSON.stringify(r);
  check('numeric prediction stores error and grade', json.includes('"error":0.1') && json.includes('"grade":"close"'));
  check('diagnosis observation is recorded', r.observations.some((o) => o.kind === 'diagnosis'));
  check('numeric input survives record export', json.includes('"kind":"input"') && json.includes('"value":300'));
  const diag = record.diagnosis(r);
  eq('diagnosis counts observations', diag.total, 1);
  check('diagnosis cites its evidence', diag.evidence[0].turnId === 't11');
}

console.log('\nrecord: the profile refuses to overclaim');
{
  const r = record.createRecord('test');
  record.observePrediction(r, 't01', 'up_bit', 'up_bit', true, 'profit');
  record.observeDecision(r, 't01', 'unit-economics', 'a', 'Raise price', 1, 1000, 2000);
  record.observeDiagnosis(r, 't11', 'pnl.spoilage', 'pnl.spoilage', true);
  r.goalProgress = { conditions: [], metCount: 2, total: 3 };
  const p = record.buildProfile(r);

  check('carries its limitations inside the artefact', p.limitations.length >= 3);
  check('says it is not validated',
    p.limitations.some((l) => /not been validated/i.test(l)));
  check('warns against automatic cut-offs',
    p.limitations.some((l) => /cut-off/i.test(l)));

  const json = JSON.stringify(p);
  check('no composite score field', !/"score"/.test(json));
  check('no rank field', !/"rank"/.test(json));
  check('no percentile field', !/"percentile"/.test(json));
  check('includes observational diagnosis statement', p.statements.some((s) => s.key === 'profile.stmt.diagnosis'));
  check('includes observational goal statement', p.statements.some((s) => s.key === 'profile.stmt.goal'));

  for (const s of p.statements) {
    check(`statement is observational: "${s.text.slice(0, 40)}..."`,
      !/likely|potential|suited|ready for|aptitude|will succeed/i.test(s.text));
  }
}

// ---------------------------------------------------------------------------
// Chapters 2-4 (ADR-0007, D-017).
//
// The first block is the important one and it is not really a test of the new
// mechanics at all — it is the guarantee that they cost chapter 1 nothing. Every
// field added for the later chapters has a default under which it contributes
// exactly zero, and `cash += cashFlow` has to stay indistinguishable from the
// `cash += profit` it replaced.
// ---------------------------------------------------------------------------

console.log('\nengine: chapter 1 is unaffected by the chapter 2-4 fields');
{
  const s = createState({ price: 500, unitCost: 300, demand: 200, capacity: 180, rent: 20000 });

  eq('no lines authored means one implicit line', linesOf(s).length, 1);
  eq('implicit line carries the flat price', linesOf(s)[0].price, 500);
  eq('working capital is zero without terms', workingCapital(s), 0);
  eq('depreciation is zero without an asset', weeklyPnl(s).depreciation, 0);
  eq('interest is zero without debt', weeklyPnl(s).interest, 0);
  eq('fx effect is zero without exposure', weeklyPnl(s).fxEffect, 0);
  eq('duty is zero without exports', weeklyPnl(s).duty, 0);

  const flow = weeklyCashFlow(s, 0);
  eq('cash flow equals profit at every default', flow.cashFlow, weeklyPnl(s).profit);

  // The whole-run version of the same claim: bank balance after twenty weeks must be
  // what simply accumulating profit would have produced.
  let byProfit = s.cash;
  let walk = s;
  for (let i = 0; i < 20; i += 1) {
    byProfit += weeklyPnl(walk).profit;
    walk = advanceWeek(walk).state;
  }
  eq('twenty weeks of cash flow equals twenty weeks of profit', walk.cash, byProfit);
}

console.log('\nengine: product mix');
{
  const s = createState({
    lines: [
      { id: 'bread', price: 1200, unitCost: 900, demand: 400, capacity: 400 },
      { id: 'cake', price: 9000, unitCost: 4000, demand: 20, capacity: 20 },
    ],
    rent: 120000, staff: 1, wagePerStaff: 60000, spoilRate: 0,
  });

  eq('flat demand is the sum of the lines', s.demand, 420);
  eq('flat capacity is the sum of the lines', s.capacity, 420);

  const p = weeklyPnl(s);
  eq('revenue sums both lines', p.revenue, 400 * 1200 + 20 * 9000);
  eq('two lines reported', p.perLine.length, 2);

  const bread = p.perLine.find((l) => l.id === 'bread');
  const cake = p.perLine.find((l) => l.id === 'cake');
  check('bread earns more revenue than cake', bread.revenue > cake.revenue);
  check('cake earns a better margin than bread', cake.margin > bread.margin,
    `bread ${bread.margin.toFixed(2)}, cake ${cake.margin.toFixed(2)}`);

  // The lesson this exists for: the line that sells most is not the line that earns.
  check('the bigger line is not automatically the better one',
    cake.margin > bread.margin && bread.unitsSold > cake.unitsSold);

  const shifted = applyEffects(s, { 'lines.cake.capacity': 10, 'lines.bread.capacity': -100 });
  eq('a line effect adds to capacity', shifted.lines.find((l) => l.id === 'cake').capacity, 30);
  eq('flat capacity follows the lines', shifted.capacity, 330);

  const repriced = applyEffects(s, { 'lines.bread.price': 1400 });
  eq('a line price replaces rather than adds', repriced.lines.find((l) => l.id === 'bread').price, 1400);

  // A projection must not write through into the state it was asked about.
  const before = s.lines[0].capacity;
  project(s, 12);
  eq('projecting does not mutate the real lines', s.lines[0].capacity, before);

  // Drift has to reach the lines, or the headline number moves while the ledger does not.
  const drifted = advanceWeeks(s, 6).state;
  check('weekly drift reaches the product lines',
    drifted.lines.reduce((sum, l) => sum + l.demand, 0) === drifted.demand);
}

console.log('\nengine: depreciation is a cost with no cash movement');
{
  const s = createState({
    price: 1000, unitCost: 600, demand: 300, capacity: 300, rent: 50000, spoilRate: 0,
    assetValue: 5200000, assetLifeWeeks: 260,
  });
  const p = weeklyPnl(s);
  eq('depreciation is the asset over its life', p.depreciation, 20000);

  const flow = weeklyCashFlow(s, 0);
  eq('depreciation is charged to profit', p.profit, p.grossProfit - p.fixedCost);
  eq('and added back for cash', flow.cashFlow, p.profit + 20000);

  const after = advanceWeek(s).state;
  eq('the asset wears down by what was charged', after.assetValue, 5180000);
}

console.log('\nengine: debt separates profit from cash');
{
  const s = createState({
    price: 1000, unitCost: 600, demand: 300, capacity: 300, rent: 50000, spoilRate: 0,
    debt: 5200000, interestRate: 0.26, repayPerWeek: 40000,
  });
  const p = weeklyPnl(s);
  eq('interest accrues weekly on the balance', p.interest, 26000);

  const flow = weeklyCashFlow(s, 0);
  eq('repayment is cash out and not a cost', flow.cashFlow, p.profit - 40000);
  check('interest is a cost and repayment is not', p.profit === p.grossProfit - p.fixedCost);

  const after = advanceWeek(s).state;
  eq('the balance falls by the repayment', after.debt, 5160000);

  // A repayment cannot take the balance below zero, and cannot draw more cash than the
  // debt that remains.
  const nearlyClear = createState({ ...s, debt: 15000, repayPerWeek: 40000 });
  eq('the final repayment is only what is left', weeklyCashFlow(nearlyClear, 0).repayment, 15000);
  eq('the balance clears rather than going negative', advanceWeek(nearlyClear).state.debt, 0);
}

console.log('\nengine: working capital consumes cash when the business grows');
{
  const base = {
    price: 1000, unitCost: 600, demand: 300, capacity: 300, rent: 50000, spoilRate: 0,
    reputation: 50,
  };
  const flat = createState(base);
  const geared = createState({ ...base, debtorWeeks: 4, inventoryWeeks: 2, creditorWeeks: 1 });

  eq('cash cycle is debtors plus stock less creditors', cashCycleWeeks(geared), 5);
  check('working capital is real money', workingCapital(geared) > 0);
  eq('the same trade earns the same profit either way',
    weeklyPnl(flat).profit, weeklyPnl(geared).profit);

  // Growth. Demand and capacity both have to move — extra demand the business cannot
  // serve is not extra trade, and so ties up nothing.
  const grow = { demand: 120, capacity: 120 };
  const growFlat = advanceWeek(applyEffects(flat, grow));
  const growGeared = advanceWeek(applyEffects(geared, grow));
  check('growing on credit terms banks less than growing on cash terms',
    growGeared.state.cash < growFlat.state.cash,
    `geared ${growGeared.state.cash}, flat ${growFlat.state.cash}`);

  // And the reverse — shrinking releases it, which is why a business in trouble can
  // look briefly cash-rich.
  const shrinkGeared = advanceWeek(applyEffects(geared, { demand: -120 }));
  const shrinkFlat = advanceWeek(applyEffects(flat, { demand: -120 }));
  check('shrinking releases working capital', shrinkGeared.state.cash > shrinkFlat.state.cash);

  // A standstill nets to nothing: the cycle is a level, not a leak.
  const still = advanceWeek(geared);
  const stillFlat = advanceWeek(flat);
  check('a flat business does not bleed cash through the cycle',
    Math.abs((still.state.cash - geared.cash) - (stillFlat.state.cash - flat.cash)) < 12000);
}

console.log('\nengine: profitable and insolvent at the same time');
{
  const s = createState({
    price: 1000, unitCost: 600, demand: 300, capacity: 300, rent: 50000, spoilRate: 0,
    debt: 4000000, interestRate: 0.2, repayPerWeek: 90000, debtorWeeks: 6,
  });
  const p = weeklyPnl(s);
  const flow = weeklyCashFlow(s, 0);
  check('the week is profitable', p.profit > 0, `profit ${p.profit}`);
  check('and still loses money', flow.cashFlow < 0, `cash flow ${flow.cashFlow}`);
  check('health check names it', healthCheck(s).includes('profitable-but-cash-negative'));
  check('runway counts the loan repayment',
    weeksOfCostsCovered(s) < weeksOfCostsCovered(createState({ ...s, repayPerWeek: 0, debt: 0 })));
}

console.log('\nengine: what the business is worth');
{
  const s = createState({
    price: 1000, unitCost: 600, demand: 300, capacity: 300, rent: 50000, spoilRate: 0,
    cash: 500000, assetValue: 2000000, assetLifeWeeks: 200, debt: 800000, interestRate: 0.2,
  });

  eq('worth is what it owns less what it owes', netWorth(s), 500000 + 2000000 - 800000);

  // The stock the whole idea rests on: money left in the business stays in it, money
  // taken out leaves it, and the two are not the same decision.
  const spent = applyEffects(s, { cash: -200000 });
  eq('taking cash out reduces what the business is worth',
    netWorth(spent), netWorth(s) - 200000);

  const bought = applyEffects(s, { cash: -200000, assetValue: 200000 });
  eq('spending cash on something the business keeps does not', netWorth(bought), netWorth(s));

  const borrowed = applyEffects(s, { cash: 500000, debt: 500000 });
  eq('borrowing changes what is owed, not what is owned', netWorth(borrowed), netWorth(s));

  // Working capital is part of the stock, and it is read from the held balance so it
  // carries the learner's own swings rather than a fresh derivation.
  const trading = createState({ ...s, debtorWeeks: 4, wcHeld: 900000 });
  eq('money owed to you counts towards worth', netWorth(trading), netWorth(s) + 900000);

  // Depreciation is the one thing that reduces worth without anybody deciding anything.
  const worn = advanceWeek(createState({ ...s, debtorWeeks: 0, wcHeld: 0 }));
  check('equipment wearing out reduces it too', netWorth(worn.state) < netWorth(s) + weeklyPnl(s).profit + 1,
    `${netWorth(worn.state)} against ${netWorth(s)}`);

  const g = gearing(s);
  eq('gearing reports what is owed', g.owed, 800000);
  eq('and what is owned', g.owned, 1700000);
  check('the lender is owed less than the owner holds', g.outweighed === false);
  check('the share is a fraction of the owner stake', Math.abs(g.share - 800000 / 1700000) < 1e-9);

  const heavy = gearing(createState({ ...s, debt: 2400000 }));
  check('more owed than held is flagged', heavy.outweighed === true);

  const sunk = gearing(createState({ ...s, cash: 0, assetValue: 0, debt: 800000 }));
  check('a stake of nothing has no ratio, rather than an infinite one', sunk.share === null);
  check('and it is still flagged', sunk.outweighed === true);

  // Chapter 1 has no assets, no debt and no terms, so worth is simply the cash box —
  // which is what a stall's owner would say if you asked them.
  const stall = createState({ price: 500, unitCost: 300, demand: 200, capacity: 180, rent: 20000 });
  eq('a stall is worth what is in the box', netWorth(stall), stall.cash);
  eq('and has no lender', gearing(stall).owed, 0);
}

console.log('\nengine: exporting');
{
  const s = createState({
    price: 4000, unitCost: 2200, demand: 1000, capacity: 1000, rent: 400000, spoilRate: 0,
    exportShare: 0.5, dutyRate: 0.1, freightPerUnit: 300,
    fxShare: 0.5, fxRate: 2500, fxBase: 2500,
  });
  const p = weeklyPnl(s);
  eq('freight applies only to exported units', p.freight, 500 * 300);
  eq('duty applies only to exported revenue', p.duty, Math.round(4000000 * 0.5 * 0.1));
  eq('a rate at its base is no gain and no loss', p.fxEffect, 0);

  const stronger = weeklyPnl(applyEffects(s, { fxRate: 2750 }));
  eq('a 10% move lands on the exposed half only', stronger.fxEffect, Math.round(4000000 * 0.5 * 0.1));
  check('and it reaches the bottom line', stronger.profit > p.profit);

  const weaker = weeklyPnl(applyEffects(s, { fxRate: 2250 }));
  check('a move the other way costs money', weaker.profit < p.profit);

  eq('exposure cannot exceed all of revenue', applyEffects(s, { fxShare: 4 }).fxShare, 1);
  eq('duty cannot exceed the sale', applyEffects(s, { dutyRate: 3 }).dutyRate, 1);
}

console.log('\nengine: the chapter 2-4 fields cannot run away');
{
  // D-014's guarantee, re-established for the financing and working-capital fields.
  // Both are new routes to the unbounded cost spiral that reached -900,000 in session
  // 006, and neither was covered by the original insolvency rule.
  let s = createState({
    price: 900, unitCost: 800, demand: 200, capacity: 400, rent: 300000, spoilRate: 0.5,
    staff: 3, wagePerStaff: 120000, debt: 8000000, interestRate: 0.3, repayPerWeek: 200000,
    debtorWeeks: 8, inventoryWeeks: 4, assetValue: 4000000, assetLifeWeeks: 200,
  });
  for (let i = 0; i < 60; i += 1) s = advanceWeek(s).state;

  check('repayments are restructured rather than draining forever', s.repayPerWeek < 200000);
  check('debtor weeks are chased down', s.debtorWeeks < 8);
  check('equipment goes with the capacity it provided', s.assetValue < 4000000);
  check('the hole stops deepening', s.cash > -40000000, `cash ${s.cash}`);
  check('the business shrinks towards a stall rather than to nothing', s.demand > 0);
  check('every number stays finite',
    Object.values(s).every((v) => typeof v !== 'number' || Number.isFinite(v)));
}

console.log('\nengine: goals can set a ceiling as well as a floor');
{
  const s = createState({ debtorWeeks: 3, inventoryWeeks: 2, creditorWeeks: 4 });
  const goal = {
    conditions: [
      { id: 'cycle', metric: 'cashCycleWeeks', max: 2 },
      { id: 'cash', field: 'cash', min: 100000 },
    ],
  };
  const result = evaluateGoal(s, goal);
  eq('a cash cycle of 1 meets a ceiling of 2', result.conditions[0].met, true);
  eq('and the ceiling is reported as such', result.conditions[0].direction, 'atMost');
  eq('a floor still reads as a floor', result.conditions[1].direction, 'atLeast');
  eq('a longer cycle misses the ceiling',
    evaluateGoal(createState({ debtorWeeks: 12 }), goal).conditions[0].met, false);
}

console.log('\ncarry: what travels between chapters');
{
  const scenario = {
    startState: { cash: 400000, rent: 180000 },
    carryIn: [
      { flag: 'keepsRecords', when: true, startState: { cash: 650000 }, note: { en: 'books', sw: 'vitabu' } },
      { flag: 'formality', atLeast: 2, startState: { licenceFees: 40000 } },
    ],
    turns: [],
  };

  // The case the whole design rests on: someone who has played nothing before.
  const cold = applyCarryIn(scenario, {});
  eq('an empty carry leaves the authored opening alone', cold.startState.cash, 400000);
  eq('and adds no opening notes', cold.notes.length, 0);
  eq('and keeps the rest of the opening', cold.startState.rent, 180000);

  const warm = applyCarryIn(scenario, { keepsRecords: true, formality: 2 });
  eq('a matching flag moves the field it names', warm.startState.cash, 650000);
  eq('atLeast matches a number floor', warm.startState.licenceFees, 40000);
  eq('and the note is offered', warm.notes.length, 1);

  eq('a flag set false does not match "when: true"',
    applyCarryIn(scenario, { keepsRecords: false }).startState.cash, 400000);
  eq('a number below the floor does not match',
    applyCarryIn(scenario, { formality: 1 }).startState.licenceFees, undefined);

  // Nothing outside the closed set survives, wherever it came from.
  const collected = collectCarry(createState({
    keepsRecords: true,
    formality: 2,
    flags: { builtTeam: true, wealth: 9999 },
  }));
  eq('flags on state are collected', collected.keepsRecords, true);
  eq('flags in state.flags are collected too', collected.builtTeam, true);
  eq('a number carries as a number', collected.formality, 2);
  check('anything outside the six is dropped', !('wealth' in collected));
  check('every collected key is one of the six',
    Object.keys(collected).every((k) => CARRY_FLAGS.includes(k)));

  // Earlier chapters' flags are not erased by a later one that never sets them.
  const kept = collectCarry(createState({}), { heldStandard: true });
  eq('a flag from an earlier chapter survives', kept.heldStandard, true);

  const turn = { situation: { en: 'plain', sw: 'plain' }, carryVariant: { flag: 'builtTeam', when: true, situation: { en: 'tinted', sw: 'tinted' } } };
  eq('a turn variant fires on its flag', situationFor(turn, { builtTeam: true }).en, 'tinted');
  eq('and not without it', situationFor(turn, {}).en, 'plain');
  eq('six flags, and the list is closed', CARRY_FLAGS.length, 6);
}

// ---------------------------------------------------------------------------
// What is now true of chapter 1's CONTENT (session 018).
//
// Read this together with "engine: chapter 1 is unaffected by the chapter 2-4 fields"
// above, and do not confuse the two. That block builds a state with `createState()`
// and never opens a scenario file: it tests the ENGINE DEFAULTS, it is still right,
// and it must stay green. What it no longer describes is chapter 1, because chapter 1
// no longer leaves the working-capital fields at their defaults.
//
// The stall now opens holding a fraction of a week of ingredients. Money it has spent
// and cannot spend again. Nothing about the P&L changes; what changes is that growing
// the trade takes cash out of the box that no decision asked for, which is the thing
// the owner says is almost always the real bottleneck and the thing chapter 1 taught
// by omission until now.
// ---------------------------------------------------------------------------

console.log('\ncontent: chapter 1 trades on working capital');
{
  const scenario = JSON.parse(
    readFileSync(new URL('../app/content/scenario-mama-asha.json', import.meta.url), 'utf8'),
  );
  const opening = createState(scenario.startState);

  check('the stall opens with stock on the shelf', opening.inventoryWeeks > 0);
  eq('and no customer owing it anything', opening.debtorWeeks, 0);
  eq('and no supplier waiting to be paid', opening.creditorWeeks, 0);
  check('so its working capital is a real figure and not zero',
    workingCapital(opening) > 0, `got ${workingCapital(opening)}`);
  eq('and its cash cycle is exactly the stock it holds',
    cashCycleWeeks(opening), scenario.startState.inventoryWeeks);

  // Settled at the opening. A chapter that begins with a position must not be charged
  // in week one for a position it began with — only for what the learner then changes.
  eq('the opening position is already held', opening.wcHeld, workingCapital(opening));
  const first = advanceWeek(opening);
  eq('so the first week banks exactly what it earned',
    first.state.cash - opening.cash, first.pnl.profit);

  // The lesson, in both directions. A bigger trade needs more money standing in it; a
  // smaller one hands the money back. Neither moves a single line of the P&L.
  const bigger = applyEffects(opening, { capacity: 150, demand: 150 });
  eq('growing the trade does not change what working capital is made of',
    bigger.inventoryWeeks, opening.inventoryWeeks);
  check('but it ties up more money',
    workingCapital(bigger) > workingCapital(opening),
    `${workingCapital(opening)} then ${workingCapital(bigger)}`);
  const grown = advanceWeek(bigger);
  check('the week is profitable', grown.pnl.profit > 0);
  check('and still banks less than it earned',
    grown.state.cash - bigger.cash < grown.pnl.profit,
    `banked ${grown.state.cash - bigger.cash} on a profit of ${grown.pnl.profit}`);

  const smaller = applyEffects(opening, { capacity: -60, demand: -60 });
  const shrunk = advanceWeek(smaller);
  check('shrinking the trade releases the money instead',
    shrunk.state.cash - smaller.cash > shrunk.pnl.profit,
    `banked ${shrunk.state.cash - smaller.cash} on a profit of ${shrunk.pnl.profit}`);

  // Turn 7 is the chapter's capex turn. It has to offer a machine, and — since this
  // change — a way to grow that buys no machine at all and is paid for in stock.
  const t07 = scenario.turns.find((turn) => turn.id === 't07');
  const machines = t07.decision.options.filter((o) => (o.effects || {}).assetValue > 0);
  const cycle = t07.decision.options.filter((o) => 'inventoryWeeks' in (o.effects || {}));
  check('turn 7 still offers a machine to buy', machines.length > 0);
  eq('and exactly one way to grow that funds the cycle instead', cycle.length, 1);

  const stock = cycle[0];
  eq('the working-capital option buys no equipment', stock.effects.assetValue || 0, 0);
  eq('takes on no weekly repayment', stock.effects.rent || 0, 0);
  eq('and hands over no cash on the day', stock.effects.cash || 0, 0);

  const funded = applyEffects(opening, stock.effects);
  check('choosing it puts more of the owner\'s money into the store',
    workingCapital(funded) > workingCapital(opening),
    `${workingCapital(opening)} then ${workingCapital(funded)}`);
  const after = advanceWeek(funded);
  check('so the cash box falls in the week the trade grows, with nothing signed',
    after.state.cash - funded.cash < after.pnl.profit,
    `banked ${after.state.cash - funded.cash} on a profit of ${after.pnl.profit}`);

  const bought = applyEffects(opening, machines[0].effects);
  check('and it costs less cash than the machine does',
    (workingCapital(funded) - workingCapital(opening))
      < (Math.abs(machines[0].effects.cash) + workingCapital(bought) - workingCapital(opening)),
    'the machine should still be the expensive way to grow');

  // And the chapter still finishes. Walked three ways — always the first option, always
  // the middle, always the last — because a squeeze that quietly starves the run is
  // exactly what this change risked and D-019 makes finishing a floor.
  for (const pick of [0, 1, 2]) {
    let state = createState(scenario.startState);
    let played = 0;
    for (const turn of scenario.turns) {
      const decision = turn.decision;
      const type = decision.type || 'choice';
      let next = state;
      if (type === 'number') {
        next = applyEffects(state, resolveNumberInput(state, decision.input, decision.input.min));
      } else if (type === 'allocate') {
        const total = allocationTotal(state, decision.allocate);
        next = applyEffects(state, resolveAllocation(
          state, decision.allocate, { [decision.allocate.buckets[0].id]: total },
        ));
      } else {
        const option = decision.options[Math.min(pick, decision.options.length - 1)];
        next = scheduleLater(applyEffects(state, option.effects || {}), option.later || [], option.label);
      }
      state = advanceWeeks(next, turn.advanceWeeks || 1).state;
      played += 1;
    }
    eq(`path ${pick}: every turn of the chapter still plays`, played, scenario.turns.length);
    check(`path ${pick}: every figure it ends on is a real number`,
      Object.values(state).every((value) => typeof value !== 'number' || Number.isFinite(value)));
    check(`path ${pick}: the stall still holds stock at the end`, workingCapital(state) > 0,
      `working capital is ${workingCapital(state)}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
