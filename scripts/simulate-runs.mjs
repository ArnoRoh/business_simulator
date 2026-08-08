// Plays every chapter end to end, several ways, and prints what the business looks
// like along the way.
//
// This exists because `validate-scenario.mjs` has now missed two whole-business
// failures — demand running to zero (session 005) and costs compounding to -900,000
// (session 006). Both were found by simulating full runs and looking at the output.
// Neither was findable by checking bands, because a band can be perfectly stable in a
// business that has quietly died.
//
// docs/agent-orchestration.md section 4.4: where the failure is something the engine
// computes, write a script and look at the numbers. Do not brief an agent to go
// looking for it.
//
// Run: node scripts/simulate-runs.mjs            all authored chapters
//      node scripts/simulate-runs.mjs bakery     one chapter
//      node scripts/simulate-runs.mjs bakery -v  and print every week

import { readFileSync } from 'node:fs';
import {
  createState, applyEffects, weeklyPnl, weeklyCashFlow, advanceWeeks, scheduleLater,
  resolveNumberInput, resolveAllocation, allocationTotal, healthCheck, cashCycleWeeks,
  evaluateGoal,
} from '../app/js/engine.js';
import { collectCarry, applyCarryIn, CARRY_FLAGS } from '../app/js/carry.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const only = args.find((a) => !a.startsWith('-'));

const manifest = JSON.parse(read('app/content/chapters.json'));

// How a simulated learner decides. Not a claim about real learners — these are the
// corners of the decision space, and a scenario has to survive all of them.
const STRATEGIES = [
  { id: 'timid', pick: () => 0, number: (values) => values[0] },
  { id: 'middling', pick: (n) => Math.floor((n - 1) / 2), number: (v) => v[Math.floor((v.length - 1) / 2)] },
  { id: 'bold', pick: (n) => n - 1, number: (values) => values[values.length - 1] },
  {
    id: 'erratic',
    // Deterministic pseudo-random, so a failure found here can be reproduced.
    pick: (n, turnIndex) => (turnIndex * 7 + 3) % n,
    number: (values, turnIndex) => values[(turnIndex * 5 + 1) % values.length],
  },
];

let problems = 0;
const fail = (msg) => { console.log(`    FAIL ${msg}`); problems += 1; };
const warn = (msg) => { console.log(`    warn ${msg}`); };

function numberValues(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const step = Number(input.step);
  if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min) return [];
  const values = [];
  for (let value = min; value <= max + step * 1e-9; value += step) values.push(Math.min(max, value));
  if (values[values.length - 1] !== max) values.push(max);
  return [...new Set(values)];
}

const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : String(n));

function playOnce(scenario, strategy) {
  let state = createState(applyCarryIn(scenario, {}).startState);
  const trace = [];
  let recoveries = 0;
  const turns = [...scenario.turns];

  for (let i = 0; i < turns.length && i < 200; i += 1) {
    const turn = turns[i];
    const decision = turn.decision || {};
    const type = decision.type || 'choice';
    let effects = {};
    let later = [];

    if (type === 'number') {
      const values = numberValues(decision.input || {});
      if (values.length === 0) { fail(`${turn.id}: numeric input has no reachable values`); break; }
      effects = resolveNumberInput(state, decision.input, strategy.number(values, i));
    } else if (type === 'allocate') {
      const total = allocationTotal(state, decision.allocate || {});
      const buckets = decision.allocate?.buckets || [];
      if (buckets.length === 0) { fail(`${turn.id}: allocation has no buckets`); break; }
      const target = buckets[strategy.pick(buckets.length, i)];
      effects = resolveAllocation(state, decision.allocate, { [target.id]: total });
    } else {
      const options = decision.options || [];
      if (options.length === 0) { fail(`${turn.id}: choice turn has no options`); break; }
      const option = options[strategy.pick(options.length, i)];
      effects = option.effects || {};
      later = option.later || [];
    }

    const advanced = advanceWeeks(
      scheduleLater(applyEffects(state, effects), later, turn.id),
      turn.advanceWeeks || 1,
    );
    state = advanced.state;

    const pnl = weeklyPnl(state);
    const flow = weeklyCashFlow(state, 0);
    trace.push({ turn: turn.id, week: state.week, state, pnl, flow });

    // The recovery chapter is inserted by main.js on the same condition, so a
    // simulation that skips it is not walking the path a learner walks.
    if (scenario.recovery && state.cash < 0 && recoveries < 2) {
      recoveries += 1;
      turns.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(scenario.recovery)), id: `recovery-${recoveries}` });
    }
  }

  return { state, trace, recoveries };
}

function inspect(scenario, run, strategy) {
  const { state, trace, recoveries } = run;
  const last = trace[trace.length - 1];
  if (!last) { fail(`${strategy.id}: no turns played`); return; }

  const rows = verbose ? trace : trace.filter((_, i) => i % 5 === 0 || i === trace.length - 1);
  console.log(`    ${strategy.id.padEnd(9)} ${recoveries ? `(${recoveries} recovery)` : ''}`);
  console.log('      turn    week  cash          profit        to hand       demand  cap   rep  cycle');
  for (const row of rows) {
    console.log(
      `      ${row.turn.padEnd(8)}${String(row.week).padEnd(6)}`
      + `${fmt(row.state.cash).padStart(12)}  ${fmt(row.pnl.profit).padStart(12)}  `
      + `${fmt(row.flow.cashFlow).padStart(12)}  ${fmt(row.state.demand).padStart(6)}  `
      + `${fmt(row.state.capacity).padStart(5)} ${fmt(row.state.reputation).padStart(4)} `
      + `${cashCycleWeeks(row.state).toFixed(1).padStart(6)}`,
    );
  }

  // --- the checks that a band-stability walk cannot see --------------------

  for (const row of trace) {
    for (const [key, value] of Object.entries(row.state)) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        fail(`${strategy.id}: ${key} is ${value} at ${row.turn}`); return;
      }
    }
    if (!Number.isFinite(row.pnl.profit)) { fail(`${strategy.id}: profit is not a number at ${row.turn}`); return; }
  }

  // Session 005's failure: the business is technically running and has no customers.
  const floorDemand = Math.round((trace[0].state.openingDemand || trace[0].state.demand) * 0.1);
  const dead = trace.find((row) => row.state.demand <= floorDemand);
  if (dead) fail(`${strategy.id}: demand collapsed to ${dead.state.demand} at ${dead.turn}`);

  // Session 006's failure: costs compounding without bound.
  const opening = trace[0].state;
  const floor = -Math.max(2000000, Math.abs(opening.cash) * 30);
  const broke = trace.find((row) => row.state.cash < floor);
  if (broke) fail(`${strategy.id}: cash reached ${fmt(broke.state.cash)} at ${broke.turn} — costs are compounding`);

  // A run where nothing ever moves is not a failure the engine can detect, and it is
  // a scenario that teaches nothing.
  const profits = trace.map((row) => row.pnl.profit);
  if (Math.max(...profits) - Math.min(...profits) < 1000) {
    warn(`${strategy.id}: weekly profit never moved by more than 1,000 across the whole run`);
  }

  // Chapters 2-4 are built on the gap between profit and cash. If a chapter never
  // opens one, its advanced content is being narrated rather than modelled (D-017).
  const diverged = trace.some((row) => row.flow.cashFlow !== row.pnl.profit);
  if (scenario.id !== 'mama-asha' && !diverged) {
    warn(`${strategy.id}: cash and profit were identical all run — no working capital, debt or assets in play`);
  }

  const finalHealth = healthCheck(state);
  if (finalHealth.length) console.log(`      ends with: ${finalHealth.join(', ')}`);

  if (scenario.goal) {
    const goal = evaluateGoal(state, scenario.goal);
    console.log(`      goal: ${goal.metCount}/${goal.total} conditions met`);
  }

  const carried = collectCarry(state);
  const named = Object.keys(carried);
  console.log(`      carries: ${named.length ? named.map((f) => `${f}=${carried[f]}`).join(', ') : 'nothing'}`);
  for (const flag of named) {
    if (!CARRY_FLAGS.includes(flag)) fail(`${strategy.id}: emitted unknown carry flag "${flag}"`);
  }
}

for (const chapter of manifest.chapters || []) {
  if (only && chapter.id !== only) continue;

  let scenario;
  try {
    scenario = JSON.parse(read(`app/content/${chapter.file}`));
  } catch {
    console.log(`\n${chapter.id}: not authored yet, skipped`);
    continue;
  }

  console.log(`\n${'='.repeat(78)}\n${chapter.id} — ${scenario.turns.length} turns\n${'='.repeat(78)}`);
  for (const strategy of STRATEGIES) inspect(scenario, playOnce(scenario, strategy), strategy);

  // Every chapter must be playable by someone who has played nothing before it.
  const withCarry = applyCarryIn(scenario, {});
  if (Object.keys(withCarry.startState).length === 0) {
    fail(`${chapter.id}: has no startState at all`);
  }
  if (withCarry.notes.length) {
    fail(`${chapter.id}: an empty carry still produced ${withCarry.notes.length} opening note(s) — a rule matched on a missing flag`);
  }
}

console.log(`\n${problems === 0 ? 'no whole-business failures found' : `${problems} problem(s)`}\n`);
process.exit(problems === 0 ? 0 : 1);
