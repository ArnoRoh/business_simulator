// Validates a scenario file against the engine.
//
// The critical check is that each option's declared `predictAnswer` matches what the
// engine ACTUALLY computes. If they disagree, the learner is marked wrong for being
// right — which would poison the behavioural record and make the whole assessment
// worthless. This must stay green.
//
// Run: node scripts/validate-scenario.mjs

import { readFileSync } from 'node:fs';
import {
  createState, applyEffects, weeklyPnl, advanceWeeks, scheduleLater, bandFor,
  resolveNumberInput, resolveAllocation, allocationTotal, bandForValue,
} from '../app/js/engine.js';

const path = process.argv[2] || 'app/content/scenario-mama-asha.json';
const scenario = JSON.parse(readFileSync(path, 'utf8'));

// `bandFor` is imported, not redefined. It used to live here, which meant the boundary
// the learner is graded against existed in the test tooling and nowhere else — the app
// could not show it even if it wanted to (Q-014).

let problems = 0;
let checks = 0;
let choiceProblems = 0;
let numericChecks = 0;
let numericProblems = 0;

// Walk several paths, because state — and therefore the delta — depends on earlier
// choices. An option whose band flips between paths is unfair to the learner.
const paths = [0, 1, 2];
const results = new Map();
const numericResults = [];

function numberValues(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const step = Number(input.step);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0 || max < min) return [];

  const values = [];
  for (let value = min; value <= max + step * 1e-9; value += step) {
    values.push(Math.min(max, value));
    if (values.length > 10000) break;
  }
  if (values.length && values[values.length - 1] !== max) values.push(max);
  return [...new Set(values)];
}

function pathNumberValue(values, pathIndex) {
  if (values.length === 0) return undefined;
  if (pathIndex === 0) return values[0];
  if (pathIndex === 1) return values[Math.floor((values.length - 1) / 2)];
  return values[values.length - 1];
}

function validateNumberTurn(state, turn, pathIndex) {
  const decision = turn.decision;
  const values = numberValues(decision.input || {});
  const outcomes = values.map((value) => {
    const after = applyEffects(state, resolveNumberInput(state, decision.input, value));
    return { value, state: after, profit: weeklyPnl(after).profit, band: bandForValue(decision.bands, value) };
  });

  const finite = outcomes.every((outcome) => Number.isFinite(outcome.profit));
  const mapped = outcomes.every((outcome) => outcome.band !== null);
  let monotonic = true;
  for (const response of decision.input?.responses || []) {
    const change = Number(response.change);
    const fieldValues = outcomes.map((outcome) => Number(outcome.state[response.field]));
    if (!Number.isFinite(change) || fieldValues.some((value) => !Number.isFinite(value))) continue;
    for (let i = 1; i < fieldValues.length; i += 1) {
      const difference = fieldValues[i] - fieldValues[i - 1];
      if ((change > 0 && difference < 0) || (change < 0 && difference > 0)) monotonic = false;
    }
  }

  numericResults.push({ turn: turn.id, type: 'number', path: pathIndex, finite, mapped, monotonic, values: values.length });
  const chosen = pathNumberValue(values, pathIndex);
  let next = state;
  if (chosen !== undefined) next = applyEffects(state, resolveNumberInput(state, decision.input, chosen));
  return { next, ok: finite && mapped && monotonic };
}

function allocationSplits(allocate, total) {
  const first = allocate.buckets?.[0]?.id;
  const second = allocate.buckets?.[1]?.id || allocate.buckets?.[0]?.id;
  if (!first || !second) return [];
  const step = Number(allocate.step);
  if (!Number.isFinite(step) || step <= 0 || total < 0) return [];
  const amounts = [];
  for (let amount = 0; amount <= total + step * 1e-9; amount += step) {
    const firstAmount = Math.min(total, amount);
    amounts.push({
      split: { [first]: firstAmount, [second]: total - firstAmount },
      fraction: total > 0 ? firstAmount / total : 0,
    });
    if (amounts.length > 10000) break;
  }
  return amounts;
}

function validateAllocationTurn(state, turn, pathIndex) {
  const allocate = turn.decision.allocate || {};
  const total = allocationTotal(state, allocate);
  const splits = allocationSplits(allocate, total);
  const outcomes = splits.map(({ split, fraction }) => {
    const after = applyEffects(state, resolveAllocation(state, allocate, split));
    return { split, fraction, profit: weeklyPnl(after).profit, band: bandForValue(turn.decision.bands, fraction) };
  });
  const finite = outcomes.every((outcome) => Number.isFinite(outcome.profit));
  const mapped = outcomes.every((outcome) => outcome.band !== null);
  numericResults.push({ turn: turn.id, type: 'allocate', path: pathIndex, finite, mapped, monotonic: true, values: splits.length });

  let next = state;
  if (splits.length) {
    const chosen = splits[pathIndex === 0 ? 0 : pathIndex === 1 ? Math.floor((splits.length - 1) / 2) : splits.length - 1];
    next = applyEffects(state, resolveAllocation(state, allocate, chosen.split));
  }
  return { next, ok: finite && mapped };
}

for (const pathChoice of paths) {
  let state = createState(scenario.startState || {});

  for (const turn of scenario.turns) {
    const type = turn.decision.type || 'choice';

    if (type === 'number') {
      const validation = validateNumberTurn(state, turn, pathChoice);
      if (!validation.ok) { numericProblems += 1; problems += 1; }
      state = advanceWeeks(validation.next, turn.advanceWeeks || 1).state;
      continue;
    }

    if (type === 'allocate') {
      const validation = validateAllocationTurn(state, turn, pathChoice);
      if (!validation.ok) { numericProblems += 1; problems += 1; }
      state = advanceWeeks(validation.next, turn.advanceWeeks || 1).state;
      continue;
    }

    const before = weeklyPnl(state).profit;

    for (const opt of turn.decision.options) {
      const after = weeklyPnl(applyEffects(state, opt.effects || {})).profit;
      const delta = after - before;
      const band = bandFor(delta);

      const key = `${turn.id}/${opt.id}`;
      if (!results.has(key)) {
        results.set(key, { turn: turn.id, opt: opt.id, declared: opt.predictAnswer, bands: [], deltas: [] });
      }
      results.get(key).bands.push(band);
      results.get(key).deltas.push(delta);
    }

    const chosen = turn.decision.options[Math.min(pathChoice, turn.decision.options.length - 1)];
    let afterChoice = applyEffects(state, chosen.effects || {});
    afterChoice = scheduleLater(afterChoice, chosen.later || [], chosen.label);
    state = advanceWeeks(afterChoice, turn.advanceWeeks || 1).state;
  }
}

console.log(`\nScenario: ${scenario.id}  (${scenario.turns.length} turns)\n`);
console.log('turn/option                        declared    computed         deltas');
console.log('-'.repeat(78));

for (const r of results.values()) {
  checks += 1;
  const unique = [...new Set(r.bands)];
  const stable = unique.length === 1;
  const match = unique.includes(r.declared);
  const ok = stable && match;

  if (!ok) { problems += 1; choiceProblems += 1; }

  const flag = ok ? '  ' : (!match ? '!!' : '~ ');
  const deltas = r.deltas.map((d) => Math.round(d)).join(', ');
  console.log(
    `${flag} ${(r.turn + '/' + r.opt).padEnd(32)} ${String(r.declared).padEnd(10)} ` +
    `${unique.join('|').padEnd(14)} ${deltas}`,
  );
}

// Structural checks.
console.log('\nstructure:');
const ids = new Set();
for (const turn of scenario.turns) {
  if (ids.has(turn.id)) { console.log(`  FAIL duplicate turn id ${turn.id}`); problems += 1; }
  ids.add(turn.id);

  const type = turn.decision?.type || 'choice';
  if (type === 'number' || type === 'allocate') {
    if (!turn.decision.bands || !Array.isArray(turn.decision.bands) || turn.decision.bands.length === 0) {
      console.log(`  FAIL ${turn.id} needs bands for ${type} input`); problems += 1;
    }
    if (type === 'number' && (!turn.decision.input || !Array.isArray(turn.decision.input.responses))) {
      console.log(`  FAIL ${turn.id} needs numeric input and responses`); problems += 1;
    }
    if (type === 'allocate' && (!turn.decision.allocate || !Array.isArray(turn.decision.allocate.buckets))) {
      console.log(`  FAIL ${turn.id} needs allocation buckets`); problems += 1;
    }
    continue;
  }

  if (!turn.decision || !Array.isArray(turn.decision.options) || turn.decision.options.length < 2) {
    console.log(`  FAIL ${turn.id} needs at least 2 options`); problems += 1;
  }
  const choiceIds = new Set((turn.decision.predictChoices || []).map((c) => c.id));
  for (const opt of turn.decision.options) {
    if (!choiceIds.has(opt.predictAnswer)) {
      console.log(`  FAIL ${turn.id}/${opt.id} predictAnswer "${opt.predictAnswer}" is not an offered choice`);
      problems += 1;
    }
    for (const field of ['outcome', 'lesson', 'label']) {
      if (!opt[field]) { console.log(`  FAIL ${turn.id}/${opt.id} missing ${field}`); problems += 1; }
    }
  }
  if (!turn.situation) { console.log(`  FAIL ${turn.id} missing situation`); problems += 1; }
}
console.log(`  ${ids.size} unique turn ids`);

for (const result of numericResults) {
  numericChecks += 1;
  const ok = result.finite && result.mapped && result.monotonic;
  if (!ok) {
    console.log(`  FAIL ${result.turn} ${result.type} path ${result.path}: finite=${result.finite}, bands=${result.mapped}, monotonic=${result.monotonic}`);
  }
}

// Is any turn a walkover? Every option landing in the same band teaches nothing.
console.log('\ndiscrimination:');
for (const turn of scenario.turns) {
  const bands = turn.decision.options.map((o) => o.predictAnswer);
  if (new Set(bands).size === 1) {
    console.log(`  weak  ${turn.id}: every option declares "${bands[0]}"`);
  }
}

console.log(`\n${checks - choiceProblems}/${checks} option predictions verified, ${problems} problem(s)`);
if (numericChecks) console.log(`${numericChecks - numericProblems}/${numericChecks} numeric turn paths verified`);
console.log('');
process.exit(problems === 0 ? 0 : 1);
