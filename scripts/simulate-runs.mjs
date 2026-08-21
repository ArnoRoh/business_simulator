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
  // The other four are corners of the decision space, and session 009 found that every
  // one of them ended wrecked in both authored chapters. That is not by itself a
  // balance problem — "always take the first option" is closer to not engaging than to
  // playing cautiously. What it could not tell us is whether *anyone* can finish well.
  // `attentive` answers that. It takes the option that leaves the business best off a
  // month later, judged on exactly what the app already puts in front of the learner:
  // the week's profit, what reaches the bank, and the health warnings in the money
  // panel — hygiene, spoilage, reputation, owner hours. Nothing hidden, no planning
  // beyond four weeks, no memory of what worked before.
  //
  // It is deliberately *not* a profit maximiser. A pure one was tried first and it ran
  // chapter 1 to 1.4m in the bank by turn 16 and then collapsed to a 90,000-a-week
  // loss with reputation at zero — which is not a balance problem, it is the lesson.
  // Requiring myopic greed to succeed would forbid this project from teaching the
  // thing it exists to teach.
  //
  // What a chapter must support is a learner who reads the warnings they are given.
  // If `attentive` cannot finish solvent and profitable, no such learner can, and for
  // this strategy alone a bad ending is a FAIL rather than a warning.
  { id: 'attentive', greedy: true },
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

// How good this option looks a month out. Weekly profit plus what actually reaches the
// bank, weighted equally, because chapters 2-4 exist on the gap between those two.
//
// The lookahead is not decoration. Scoring the option's *immediate* effect made this
// strategy identical to `timid` on chapter 1, turn for turn: most effects move demand,
// reputation or hygiene rather than this week's P&L, so every option tied and the tie
// went to the first one. Four weeks is long enough for the engine to turn a reputation
// or hygiene change back into money, which is the feedback the learner is being taught
// to see.
const LOOKAHEAD_WEEKS = 4;

// What one health warning is worth, as a multiple of the chapter's opening weekly
// profit. Expressed that way so it means the same thing to a stall turning over
// 26,000 a week and a factory turning over 788,000. At 1.5 it is heavy enough that
// this strategy will give up real money to keep hygiene up and its owner off the
// floor, which is the behaviour the chapters are written to reward.
const HEALTH_PENALTY = 1.5;

// And what a full 50-point slide in reputation or hygiene is worth, on the same scale.
const METER_WEIGHT = 2;

function scoreEffects(state, effects, later, turnId, unit) {
  let after;
  try {
    after = advanceWeeks(
      scheduleLater(applyEffects(state, effects), later || [], turnId),
      LOOKAHEAD_WEEKS,
    ).state;
  } catch { return -Infinity; }
  const profit = weeklyPnl(after).profit;
  const banked = (after.cash - state.cash) / LOOKAHEAD_WEEKS;
  if (!Number.isFinite(profit) || !Number.isFinite(banked)) return -Infinity;
  // Reputation and hygiene are on screen as meters the whole time, not just as
  // warnings, so this reads them the way a learner watching the meters would — a slide
  // costs something before it crosses a threshold, not only after. Without this the
  // strategy trades reputation away a few points at a time for profit it can see, and
  // arrives at the last quarter of a chapter with none left. That is a real thing
  // learners do; it is not a thing an "is this chapter finishable" probe should do.
  const meters = ((after.reputation - 50) + (after.hygiene - 50)) / 50;
  return profit + banked
    + meters * METER_WEIGHT * unit
    - healthCheck(after).length * HEALTH_PENALTY * unit;
}

// Picks the candidate with the best score. Ties go to the earlier candidate, so the
// run stays deterministic and reproducible.
function bestOf(state, candidates, turnId, unit) {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreEffects(state, candidate.effects, candidate.later, turnId, unit);
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

function playOnce(scenario, strategy) {
  let state = createState(applyCarryIn(scenario, {}).startState);
  // The scale a health warning is priced against, fixed at the opening position so it
  // does not drift with the run. See HEALTH_PENALTY.
  const unit = Math.max(1, Math.abs(weeklyPnl(state).profit));
  const trace = [];
  let recoveries = 0;
  const brokeAt = [];
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
      if (strategy.greedy) {
        effects = bestOf(state, values.map(
          (value) => ({ effects: resolveNumberInput(state, decision.input, value) }),
        ), turn.id, unit).effects;
      } else {
        effects = resolveNumberInput(state, decision.input, strategy.number(values, i));
      }
    } else if (type === 'allocate') {
      const total = allocationTotal(state, decision.allocate || {});
      const buckets = decision.allocate?.buckets || [];
      if (buckets.length === 0) { fail(`${turn.id}: allocation has no buckets`); break; }
      const candidates = buckets.map(
        (bucket) => ({ effects: resolveAllocation(state, decision.allocate, { [bucket.id]: total }) }),
      );
      effects = strategy.greedy
        ? bestOf(state, candidates, turn.id, unit).effects
        : candidates[strategy.pick(buckets.length, i)].effects;
    } else {
      const options = decision.options || [];
      if (options.length === 0) { fail(`${turn.id}: choice turn has no options`); break; }
      const option = strategy.greedy
        ? bestOf(state, options.map((o) => ({ ...o, effects: o.effects || {}, later: o.later || [] })), turn.id, unit)
        : options[strategy.pick(options.length, i)];
      effects = option.effects || {};
      later = option.later || [];
    }

    const cashBefore = state.cash;
    const weeks = turn.advanceWeeks || 1;
    const advanced = advanceWeeks(
      scheduleLater(applyEffects(state, effects), later, turn.id),
      weeks,
    );
    state = advanced.state;

    const pnl = weeklyPnl(state);
    // What actually reached the bank, per week, taken from the cash the engine banked
    // rather than recomputed here. `weeklyCashFlow(state, 0)` was used for this and
    // asserts no working-capital movement — so the column read as if the money were
    // fine on exactly the turns where a chapter 2-4 business is quietly draining.
    const banked = Math.round((state.cash - cashBefore) / weeks);
    trace.push({ turn: turn.id, week: state.week, state, pnl, banked });

    // The recovery chapter is inserted by main.js on the same condition, so a
    // simulation that skips it is not walking the path a learner walks.
    if (scenario.recovery && state.cash < 0 && recoveries < 2) {
      recoveries += 1;
      brokeAt.push(turn.id);
      turns.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(scenario.recovery)), id: `recovery-${recoveries}` });
    }
  }

  return { state, trace, recoveries, brokeAt };
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
      + `${fmt(row.banked).padStart(12)}  ${fmt(row.state.demand).padStart(6)}  `
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

  // Every chapter is now built on the gap between profit and cash. If a chapter never
  // opens one, its advanced content is being narrated rather than modelled (D-017).
  //
  // Chapter 1 was exempt from this until session 017, because it held no asset, no loan
  // and no credit term and so could not diverge. It carries `inventoryWeeks` now (D-040),
  // so the exemption is gone and the check applies to all four.
  const diverged = trace.some((row) => row.banked !== row.pnl.profit);
  if (!diverged) {
    warn(`${strategy.id}: cash and profit were identical all run — no working capital, debt or assets in play`);
  }

  // "Does the timid strategy survive? A chapter only the boldest path can finish is not
  // a teaching tool" — the authoring contract has said so since chapters 2-4 were
  // specified, and nothing checked it. These are warnings rather than failures because
  // the four strategies are crude: "always take the first option" is closer to not
  // engaging than to playing cautiously, and a run that ends in trouble can be the
  // lesson. Read them. If every strategy ends wrecked, the chapter is not teaching
  // anyone that their decisions mattered.
  //
  // For `attentive` they are failures. That strategy only ever takes the option that
  // leaves the business better off this week — it is the floor, not the ceiling, of
  // playing thoughtfully. A chapter it cannot finish solvent and profitable has no
  // path a learner could find either, and a chapter where care is not rewarded is not
  // a teaching tool (contract A.11).
  const report = strategy.greedy ? fail : warn;
  if (state.cash < 0) report(`${strategy.id}: ends insolvent, cash ${fmt(state.cash)}`);
  if (weeklyPnl(state).profit < 0) {
    report(`${strategy.id}: ends loss-making, weekly profit ${fmt(weeklyPnl(state).profit)}`);
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
  const runs = STRATEGIES.map((strategy) => {
    const run = playOnce(scenario, strategy);
    inspect(scenario, run, strategy);
    return run;
  });

  // A turn that bankrupts every strategy is not a decision, it is a scripted
  // bankruptcy — the learner is told their choice mattered and then shown that it did
  // not, which teaches the opposite of what the turn is for.
  const firstBreak = runs.map((run) => run.brokeAt[0]);
  if (firstBreak.every((id) => id !== undefined && id === firstBreak[0])) {
    fail(`${chapter.id}: every strategy goes insolvent at ${firstBreak[0]} — no option avoids it`);
  }

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
