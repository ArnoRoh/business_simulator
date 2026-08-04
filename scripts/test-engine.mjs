// Headless checks for the simulation engine and the behavioural record.
//
// No test framework — this project has no toolchain yet (D-001) and adding one for
// a proof of concept would be premature. Run: node scripts/test-engine.mjs

import {
  createState, applyEffects, weeklyPnl, advanceWeek, advanceWeeks, ownerLoad, healthCheck,
  scheduleLater, project, baseOwnerHours, bandFor, BAND_SAME, BAND_LOT,
} from '../app/js/engine.js';
import * as record from '../app/js/record.js';

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
  eq('a big drop is "down"', bandFor(-20000), 'down');
  eq('just below the same-band edge is "down"', bandFor(-BAND_SAME - 1), 'down');
  eq('no change is "same"', bandFor(0), 'same');
  eq('the same-band edge is still "same"', bandFor(BAND_SAME), 'same');
  eq('just above it is "up a little"', bandFor(BAND_SAME + 1), 'up_bit');
  eq('the up-a-lot edge is still "up a little"', bandFor(BAND_LOT), 'up_bit');
  eq('past it is "up a lot"', bandFor(BAND_LOT + 1), 'up_lot');
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

console.log('\nrecord: the profile refuses to overclaim');
{
  const r = record.createRecord('test');
  record.observePrediction(r, 't01', 'up_bit', 'up_bit', true, 'profit');
  record.observeDecision(r, 't01', 'unit-economics', 'a', 'Raise price', 1, 1000, 2000);
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

  for (const s of p.statements) {
    check(`statement is observational: "${s.text.slice(0, 40)}..."`,
      !/likely|potential|suited|ready for|aptitude|will succeed/i.test(s.text));
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
