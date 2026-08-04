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
} from '../app/js/engine.js';

const path = process.argv[2] || 'app/content/scenario-mama-asha.json';
const scenario = JSON.parse(readFileSync(path, 'utf8'));

// `bandFor` is imported, not redefined. It used to live here, which meant the boundary
// the learner is graded against existed in the test tooling and nowhere else — the app
// could not show it even if it wanted to (Q-014).

let problems = 0;
let checks = 0;

// Walk several paths, because state — and therefore the delta — depends on earlier
// choices. An option whose band flips between paths is unfair to the learner.
const paths = [0, 1, 2];
const results = new Map();

for (const pathChoice of paths) {
  let state = createState(scenario.startState || {});

  for (const turn of scenario.turns) {
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

  if (!ok) problems += 1;

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

// Is any turn a walkover? Every option landing in the same band teaches nothing.
console.log('\ndiscrimination:');
for (const turn of scenario.turns) {
  const bands = turn.decision.options.map((o) => o.predictAnswer);
  if (new Set(bands).size === 1) {
    console.log(`  weak  ${turn.id}: every option declares "${bands[0]}"`);
  }
}

console.log(`\n${checks - problems}/${checks} option predictions verified, ${problems} problem(s)\n`);
process.exit(problems === 0 ? 0 : 1);
