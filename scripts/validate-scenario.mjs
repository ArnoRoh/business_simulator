// Validates a scenario file against the engine.
//
// The critical check is that each option's declared `predictAnswer` matches what the
// engine ACTUALLY computes. If they disagree, the learner is marked wrong for being
// right — which would poison the behavioural record and make the whole assessment
// worthless. This must stay green.
//
// Run: node scripts/validate-scenario.mjs                    every authored chapter
//      node scripts/validate-scenario.mjs app/content/x.json  just that one
//
// With no argument this used to validate chapter 1 and only chapter 1, so a second
// chapter could be authored, listed in the manifest, loaded by the app and shipped
// without this check ever having looked at it. It walks the manifest now.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  createState, applyEffects, weeklyPnl, advanceWeeks, scheduleLater, bandFor, setBands,
  resolveNumberInput, resolveAllocation, allocationTotal, bandForValue, readField,
  predictionWindow, decisionOutcomes,
} from '../app/js/engine.js';
import { applyCarryIn, CARRY_FLAGS } from '../app/js/carry.js';

// Read out of scene.js rather than duplicated here, so adding a scene cannot leave the
// validator rejecting a name that now works.
const SCENES = [...readFileSync(new URL('../app/js/scene.js', import.meta.url), 'utf8')
  .matchAll(/^\s+'?([a-zA-Z-]+)'?:\s*(?:\(root|build)/gm)].map((m) => m[1]);

// The lines a diagnose step can put a figure against, read out of the two functions in
// ui.js that produce them rather than copied here, so the list cannot drift away from
// what the app can actually render.
const UI_SOURCE = readFileSync(new URL('../app/js/ui.js', import.meta.url), 'utf8');
const between = (from, to) => UI_SOURCE.slice(UI_SOURCE.indexOf(from), UI_SOURCE.indexOf(to));
const DIAGNOSABLE = [...new Set([
  ...[...between('function ledgerRows(', 'function lineLabel(')
    .matchAll(/'(pnl\.[a-zA-Z]+)'/g)].map((m) => m[1]),
  ...[...between('function diagnoseEvidence(', 'export function renderDiagnose(')
    .matchAll(/'(cash\.[a-zA-Z]+)'/g)].map((m) => m[1]),
])];

// If the extraction above ever stops finding them, every diagnose option starts looking
// invalid — or, worse, valid. Say so rather than reporting nonsense about the content.
for (const expected of ['pnl.sales', 'pnl.spoilage', 'cash.repayment', 'cash.workingCapitalChange']) {
  if (!DIAGNOSABLE.includes(expected)) {
    console.error(`validate-scenario: could not read the ledger lines out of ui.js — "${expected}" is missing. Fix the extraction, not the content.`);
    process.exit(2);
  }
}

if (!process.argv[2]) {
  // One child per chapter rather than a loop, because everything below is written
  // against a single scenario in module scope — and a chapter that leaves state behind
  // for the next one is exactly the class of bug this script exists to catch.
  const manifest = JSON.parse(readFileSync(new URL('../app/content/chapters.json', import.meta.url), 'utf8'));
  let worst = 0;
  for (const chapter of manifest.chapters || []) {
    const file = `app/content/${chapter.file}`;
    try { readFileSync(new URL(`../${file}`, import.meta.url)); } catch {
      console.log(`\n${chapter.id}: not authored yet, skipped`);
      continue;
    }
    const run = spawnSync(process.execPath, [process.argv[1], file], { stdio: 'inherit' });
    worst = Math.max(worst, run.status || 0);
  }
  process.exit(worst);
}

const path = process.argv[2];
const scenario = JSON.parse(readFileSync(path, 'utf8'));

// The chapter's own band edges, exactly as the app will set them when it loads the
// file. Grading a bakery against a stall's thresholds is how "up a little" came to be
// reachable twice in forty-five options.
setBands(scenario.bands);

// Every walk below starts from the opening a learner arriving with NO carried flags
// would get. That is the guaranteed-playable case (ADR-0007): a chapter must be
// correct for someone who has played nothing before it, and a carry rule can only move
// fields it names itself.
const openingState = applyCarryIn(scenario, {}).startState;

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
const allocationTotals = [];

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

  // The field a number decision writes must be a field that exists — a flat one, or a
  // product line addressed as `lines.<id>.<field>`. Anything else is written into
  // `flags` by `applyEffects`, so the control moves and the business does not.
  //
  // The anchor matters just as much. `start: "current"` used to be read with a plain
  // index, which is `undefined` for a line, so the response curve was measured from
  // zero: chapter 4's export price cost 34–50 reputation for any price at all, and
  // chapter 3's loaf price wiped ~2,000 loaves of demand for holding steady. Both
  // passed every check here, because a curve measured from the wrong anchor is still
  // finite and still monotonic. This is the check that would have caught them.
  const anchored = decision.input?.start !== 'current'
    || Number.isFinite(Number(readField(state, decision.input.field)));
  const addressable = readField(state, decision.input?.field) !== undefined;
  if (!anchored || !addressable) {
    console.log(`  FAIL ${turn.id} input field "${decision.input?.field}" `
      + `${addressable ? 'has no current value to anchor "start": "current" on' : 'is not a state field'}`);
    problems += 1;
  }
  const outcomes = values.map((value) => {
    const after = applyEffects(state, resolveNumberInput(state, decision.input, value));
    return { value, state: after, profit: weeklyPnl(after).profit, band: bandForValue(decision.bands, value) };
  });

  const finite = outcomes.every((outcome) => Number.isFinite(outcome.profit));
  const mapped = outcomes.every((outcome) => outcome.band !== null);
  let monotonic = true;
  for (const response of decision.input?.responses || []) {
    const change = Number(response.change);
    const fieldValues = outcomes.map((outcome) => Number(readField(outcome.state, response.field)));
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
  // A split of nothing is a control the learner cannot move (D-015), and the situation
  // above it usually claims there is money to divide. Reported per path rather than
  // failed: a business that reaches this turn broke has nothing spare, which is a true
  // thing about that path — but if it is true on EVERY path the turn cannot work at all.
  allocationTotals.push({ turn: turn.id, path: pathIndex, total });

  let next = state;
  if (splits.length) {
    const chosen = splits[pathIndex === 0 ? 0 : pathIndex === 1 ? Math.floor((splits.length - 1) / 2) : splits.length - 1];
    next = applyEffects(state, resolveAllocation(state, allocate, chosen.split));
  }
  return { next, ok: finite && mapped };
}

for (const pathChoice of paths) {
  let state = createState(openingState);

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

  const turnType = (turn.decision && turn.decision.type) || 'choice';

  if (turnType === 'choice') {
    if (!turn.decision || !Array.isArray(turn.decision.options) || turn.decision.options.length < 2) {
      console.log(`  FAIL ${turn.id} needs at least 2 options`); problems += 1;
    }
    const choiceIds = new Set((turn.decision.predictChoices || []).map((c) => c.id));
    for (const opt of turn.decision.options || []) {
      if (!choiceIds.has(opt.predictAnswer)) {
        console.log(`  FAIL ${turn.id}/${opt.id} predictAnswer "${opt.predictAnswer}" is not an offered choice`);
        problems += 1;
      }
      for (const field of ['outcome', 'lesson', 'label']) {
        if (!opt[field]) { console.log(`  FAIL ${turn.id}/${opt.id} missing ${field}`); problems += 1; }
      }
    }
  } else {
    // A free decision has no options; what it must have instead is a usable range and
    // narrative covering every value in it, or the learner can reach a state the
    // scenario has nothing to say about.
    const shape = turnType === 'number' ? turn.decision.input : turn.decision.allocate;
    if (!shape) {
      console.log(`  FAIL ${turn.id} is type "${turnType}" but has no ${turnType === 'number' ? 'input' : 'allocate'} block`);
      problems += 1;
    }
    if (!Array.isArray(turn.decision.bands) || turn.decision.bands.length === 0) {
      console.log(`  FAIL ${turn.id} is type "${turnType}" and needs bands for its outcome text`);
      problems += 1;
    }
    for (const [i, band] of (turn.decision.bands || []).entries()) {
      for (const field of ['outcome', 'lesson']) {
        if (!band[field]) { console.log(`  FAIL ${turn.id} band ${i} missing ${field}`); problems += 1; }
      }
    }
    if (turnType === 'number' && shape) {
      if (!(shape.max > shape.min)) {
        console.log(`  FAIL ${turn.id} input range is empty (min ${shape.min}, max ${shape.max})`);
        problems += 1;
      }
      if (!(shape.step > 0)) { console.log(`  FAIL ${turn.id} input step must be positive`); problems += 1; }
    }
  }

  // A diagnose step whose answer is not on offer can never be got right.
  //
  // An option is either a key the app can price — a P&L row or a line of the cash
  // statement — or an object carrying its own words, for evidence the engine has no
  // line for, such as a step of a production process. Anything else renders as the raw
  // key with "TZS 0" beside it, which is what chapters 2, 3 and 4 all did, including
  // for the correct answer.
  if (turn.diagnose) {
    const options = turn.diagnose.options || [];
    const ids = options.map((o) => (o !== null && typeof o === 'object' ? o.id : o));
    if (!ids.includes(turn.diagnose.answer)) {
      console.log(`  FAIL ${turn.id} diagnose answer "${turn.diagnose.answer}" is not among its options`);
      problems += 1;
    }
    for (const option of options) {
      if (option !== null && typeof option === 'object') {
        if (!option.id || !option.label || !option.label.en || !option.label.sw) {
          console.log(`  FAIL ${turn.id} diagnose option "${option.id || '?'}" needs an id and a label in both languages`);
          problems += 1;
        }
      } else if (!DIAGNOSABLE.includes(option)) {
        console.log(`  FAIL ${turn.id} diagnose option "${option}" is not a line the app can show; `
          + `use one of ${DIAGNOSABLE.join(', ')}, or give it a label of its own`);
        problems += 1;
      }
    }
  }

  if (!turn.situation) { console.log(`  FAIL ${turn.id} missing situation`); problems += 1; }

  // drawScene falls back to 'stall-small' for a name it does not know, so a typo — or
  // a scene an author wished existed — renders a mandazi stall in the middle of a
  // factory chapter and nothing anywhere reports a problem.
  if (turn.scene && !SCENES.includes(turn.scene)) {
    console.log(`  FAIL ${turn.id} scene "${turn.scene}" does not exist; drawScene would silently draw a stall`);
    problems += 1;
  }
}
console.log(`  ${ids.size} unique turn ids`);

// --- chapters (ADR-0007) -------------------------------------------------
//
// Two ways a chapter can be quietly broken for the learner who needs it most — the
// one arriving with nothing, having played no earlier chapter. Both are silent: the
// app renders, and the opening is simply wrong.
console.log('\ncarry:');
{
  const rules = [
    ...(Array.isArray(scenario.carryIn) ? scenario.carryIn.map((r) => ['carryIn', r]) : []),
    ...scenario.turns.filter((t) => t.carryVariant).map((t) => [`${t.id}.carryVariant`, t.carryVariant]),
  ];

  for (const [where, rule] of rules) {
    if (!CARRY_FLAGS.includes(rule.flag)) {
      console.log(`  FAIL ${where} names "${rule.flag}", which is not one of the six carried flags`);
      problems += 1;
    }
    if (rule.when === undefined && rule.atLeast === undefined) {
      console.log(`  FAIL ${where} has neither "when" nor "atLeast", so it can never be evaluated`);
      problems += 1;
    }
  }

  // A carryIn override REPLACES the authored opening field; it is not a delta.
  //
  // Turn effects are the other way round — a signed "-0.02" there subtracts (D-022) —
  // and three rules were authored in that habit. The factory opened a learner who had
  // taken credit in the bakery on an interest rate of -0.02, so a 30,000,000 loan paid
  // them 11,538 a week and the ledger printed "Interest on the loan" as money coming
  // in. Nothing could see it: the three walked paths all start from an empty carry, and
  // a chapter opened this way still renders perfectly.
  //
  // No opening field this game has is legitimately negative — not cash, not hours, not
  // a rate — so the rule is simply that an override must be a value the chapter could
  // have been authored with in the first place.
  for (const [where, rule] of rules) {
    for (const [field, value] of Object.entries(rule.startState || {})) {
      if (typeof value === 'string' && /^[+-]/.test(value)) {
        console.log(`  FAIL ${where} sets ${field} to "${value}"; a carry override replaces the value, so it cannot be signed`);
        problems += 1;
      } else if (typeof value === 'number' && value < 0) {
        console.log(`  FAIL ${where} opens ${field} at ${value}; a carry override replaces the authored ${field}, it does not subtract from it`);
        problems += 1;
      }
    }
  }

  // A rule that fires on an absent flag would change the opening for a learner who
  // brought nothing — which is the case the whole design rests on being safe.
  const empty = applyCarryIn(scenario, {});
  if (empty.notes.length > 0) {
    console.log(`  FAIL an empty carry produced ${empty.notes.length} opening note(s)`);
    problems += 1;
  }
  if (JSON.stringify(empty.startState) !== JSON.stringify(scenario.startState || {})) {
    console.log('  FAIL an empty carry moved the authored startState');
    problems += 1;
  }

  // ADR-0007 caps a flag's turn-level reach. Exceeding it is how "tint" becomes
  // "branch", and branching content cannot be walked by three paths.
  const tinted = scenario.turns.filter((t) => t.carryVariant).length;
  if (tinted > 2) {
    console.log(`  FAIL ${tinted} turns carry a variant; ADR-0007 allows at most 2 per chapter`);
    problems += 1;
  }

  // A product line with no name renders as its raw id in the ledger.
  for (const line of (scenario.startState || {}).lines || []) {
    if (!line.label) {
      console.log(`  FAIL product line "${line.id}" has no label, so it shows its id on screen`);
      problems += 1;
    }
  }

  console.log(`  ${rules.length} carry rule(s), ${tinted} tinted turn(s)`);
}

// A range that excludes where the learner already is, or a prediction window that
// cannot hold the answer, both read on screen as a broken control: buttons that do
// nothing, or a grade of "off" for reasoning correctly. Both shipped once, and neither
// was visible to any check here — band stability said nothing about reachability.
console.log('\nreachability:');
for (const pathChoice of paths) {
  let state = createState(openingState);

  for (const turn of scenario.turns) {
    const type = turn.decision.type || 'choice';

    if (type === 'number' && (turn.decision.input || {}).start === 'current') {
      const input = turn.decision.input;
      const current = Number(state[input.field]);
      if (Number.isFinite(current) && (current < Number(input.min) || current > Number(input.max))) {
        console.log(`  FAIL ${turn.id} path ${pathChoice}: ${input.field} is ${current}, outside the offered range ${input.min}–${input.max}`);
        problems += 1;
      }
    }

    if (turn.decision.predict === 'number') {
      const window = predictionWindow(state, turn);
      const unreachable = decisionOutcomes(state, turn)
        .filter((profit) => profit < window.min || profit > window.max);
      if (unreachable.length) {
        console.log(`  FAIL ${turn.id} path ${pathChoice}: ${unreachable.length} outcome(s) outside the prediction window ${Math.round(window.min)}–${Math.round(window.max)}`);
        problems += 1;
      }
    }

    // Advance the same way the main walk does, so the states checked are real ones.
    if (type === 'number') {
      const chosen = pathNumberValue(numberValues(turn.decision.input || {}), pathChoice);
      const next = chosen === undefined
        ? state
        : applyEffects(state, resolveNumberInput(state, turn.decision.input, chosen));
      state = advanceWeeks(next, turn.advanceWeeks || 1).state;
    } else if (type === 'allocate') {
      state = advanceWeeks(validateAllocationTurn(state, turn, pathChoice).next, turn.advanceWeeks || 1).state;
    } else {
      const chosen = turn.decision.options[Math.min(pathChoice, turn.decision.options.length - 1)];
      const afterChoice = scheduleLater(
        applyEffects(state, chosen.effects || {}), chosen.later || [], chosen.label,
      );
      state = advanceWeeks(afterChoice, turn.advanceWeeks || 1).state;
    }
  }
}
console.log(`  ${paths.length} paths walked for reachable ranges and prediction windows`);

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
  // Free decisions discriminate by construction — every value gives a different result
  // — so this check only applies to the option-based turns it was written for.
  if (!turn.decision.options) continue;
  const bands = turn.decision.options.map((o) => o.predictAnswer);
  if (new Set(bands).size === 1) {
    console.log(`  weak  ${turn.id}: every option declares "${bands[0]}"`);
  }
}

// A wider sweep of the same question the three fixed paths ask.
//
// Three paths are "always the first option", "always the middle" and "always the last".
// A learner does none of those, and an option's band depends on the state earlier
// decisions left behind — so three walks can report a chapter stable that is not. This
// found flips in three of the four chapters on the day it was written, in content the
// three-path check had just passed.
//
// It **reports** rather than fails, deliberately. Chapter 1 is content the owner has
// played and accepted and rebalancing it is their call (Q-021), so a check that turned
// their accepted chapter red would be an integrator overruling them. See Q-022 — the
// intention is that this becomes a FAIL once that ruling exists.
//
// The seed is fixed, so the same run gives the same answer and a fix can be verified.
console.log('\nstability across many paths:');
{
  let seed = 20260808;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const seen = new Map();
  const RUNS = 400;

  for (let run = 0; run < RUNS; run += 1) {
    let state = createState(openingState);
    for (const turn of scenario.turns) {
      const decision = turn.decision;
      const type = decision.type || 'choice';

      if (type === 'number') {
        const values = numberValues(decision.input || {});
        const value = values[Math.floor(rnd() * values.length)];
        const next = value === undefined
          ? state
          : applyEffects(state, resolveNumberInput(state, decision.input, value));
        state = advanceWeeks(next, turn.advanceWeeks || 1).state;
        continue;
      }

      if (type === 'allocate') {
        const splits = allocationSplits(decision.allocate || {}, allocationTotal(state, decision.allocate || {}));
        const chosen = splits[Math.floor(rnd() * splits.length)];
        const next = chosen === undefined
          ? state
          : applyEffects(state, resolveAllocation(state, decision.allocate, chosen.split));
        state = advanceWeeks(next, turn.advanceWeeks || 1).state;
        continue;
      }

      const before = weeklyPnl(state).profit;
      for (const opt of decision.options) {
        const band = bandFor(weeklyPnl(applyEffects(state, opt.effects || {})).profit - before);
        const key = `${turn.id}/${opt.id}`;
        if (!seen.has(key)) seen.set(key, { declared: opt.predictAnswer, bands: new Set() });
        seen.get(key).bands.add(band);
      }

      const chosen = decision.options[Math.floor(rnd() * decision.options.length)];
      const afterChoice = scheduleLater(
        applyEffects(state, chosen.effects || {}), chosen.later || [], chosen.label,
      );
      state = advanceWeeks(afterChoice, turn.advanceWeeks || 1).state;
    }
  }

  const unstable = [...seen.entries()]
    .filter(([, r]) => r.bands.size > 1 || !r.bands.has(r.declared));
  for (const [key, r] of unstable) {
    console.log(`  drift ${key.padEnd(38)} ${String(r.declared).padEnd(10)} ${[...r.bands].join('|')}`);
  }
  console.log(`  ${seen.size - unstable.length}/${seen.size} options hold their band across ${RUNS} random paths`);
}

// What there was to allocate, on each path walked. See validateAllocationTurn.
{
  const byTurn = new Map();
  for (const row of allocationTotals) {
    if (!byTurn.has(row.turn)) byTurn.set(row.turn, []);
    byTurn.get(row.turn).push(row.total);
  }
  for (const [turn, totals] of byTurn) {
    const empty = totals.filter((t) => t <= 0).length;
    if (empty === totals.length) {
      console.log(`  FAIL ${turn} has nothing to allocate on any path walked`);
      problems += 1;
    } else if (empty > 0) {
      console.log(`\nallocation:\n  empty ${turn}: nothing to split on ${empty} of ${totals.length} paths`);
    }
  }
}

console.log(`\n${checks - choiceProblems}/${checks} option predictions verified, ${problems} problem(s)`);
if (numericChecks) console.log(`${numericChecks - numericProblems}/${numericChecks} numeric turn paths verified`);
console.log('');
process.exit(problems === 0 ? 0 : 1);
