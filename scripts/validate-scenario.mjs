// Validate authored inputs, carry contracts and every live outcome on seeded paths.
// Answer bands are computed from the current state; content cannot declare them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as e from '../app/js/engine.js';
import { applyCarryIn, CARRY_FLAGS } from '../app/js/carry.js';
const read = name => JSON.parse(readFileSync(new URL(`../app/content/${name}`, import.meta.url)));
const manifest = read('chapters.json');
let checked = 0;
let seed = 42;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function finite(value) {
  if (typeof value === 'number') assert(Number.isFinite(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(finite);
}
function candidates(state, turn) {
  const d = turn.decision, type = d.type || 'choice';
  if (type === 'cashbook') return [{ effects: { keepsRecords: true } }];
  if (type === 'number') return [d.input.min, (d.input.min + d.input.max) / 2, d.input.max].map(n => ({ effects: e.resolveNumberInput(state, d.input, n) }));
  if (type === 'allocate') return d.allocate.buckets.map(b => ({ effects: e.resolveAllocation(state, d.allocate, { [b.id]: e.allocationTotal(state, d.allocate) }) }));
  return d.options;
}
for (const chapter of manifest.chapters) {
  const scenario = read(chapter.file);
  assert.equal(scenario.turns.length, 20, chapter.id);
  assert(Number.isInteger(scenario.version) && scenario.version > 0);
  assert.match(scenario.currency, /^[A-Z]{3}$/);
  assert.equal(new Set(scenario.turns.map(t => t.id)).size, 20);
  assert(scenario.turns.filter(t => t.carryVariant).length <= 2);
  assert.deepEqual(applyCarryIn(scenario, {}).startState, scenario.startState);
  for (const rule of scenario.carryIn || []) {
    assert(CARRY_FLAGS.includes(rule.flag));
    for (const value of Object.values(rule.startState || {})) if (typeof value === 'number') assert(value >= 0);
  }
  for (const line of scenario.startState.lines || []) assert(line.label?.en && line.label?.sw);
  for (const turn of [...scenario.turns, scenario.recovery].filter(Boolean)) {
    const d = turn.decision, type = d.type || 'choice';
    assert(['choice', 'number', 'allocate', 'cashbook'].includes(type));
    assert(turn.situation.en && turn.situation.sw && d.prompt.en && d.prompt.sw);
    if (type === 'number') {
      assert(d.input.max > d.input.min && d.input.step > 0 && Array.isArray(d.input.responses));
      assert(e.readField(e.createState(scenario.startState), d.input.field) !== undefined);
      assert(d.bands?.length);
    }
    if (type === 'allocate') {
      assert(d.allocate.step > 0 && d.allocate.buckets.some(b => b.keepsCash));
      assert.equal(new Set(d.allocate.buckets.map(b => b.id)).size, d.allocate.buckets.length);
    }
    if (type === 'choice') {
      assert(d.options.length >= 2);
      assert.equal(new Set(d.options.map(o => o.id)).size, d.options.length);
      for (const o of d.options) {
        assert(o.label?.en && o.outcome?.en && o.lesson?.en);
        assert(!('predictAnswer' in o), 'Live outcomes are the only answer source');
        for (const later of o.later || []) assert(Number.isInteger(later.inWeeks) && later.inWeeks > 0);
      }
    }
    if (turn.diagnose && !turn.diagnose.liveConstraint) {
      assert(turn.diagnose.options.map(o => typeof o === 'string' ? o : o.id).includes(turn.diagnose.answer));
    }
  }
  e.setBands(scenario.bands);
  for (let run = 0; run < 100; run++) {
    let state = e.createState(scenario.startState);
    for (const turn of scenario.turns) {
      const options = candidates(state, turn);
      for (const option of options) {
        const original = JSON.stringify(state);
        const result = e.resolveTurn(state, turn, option.effects, option.later);
        assert.equal(JSON.stringify(state), original, 'Resolving a candidate must not mutate the real state');
        finite(result);
        const c = result.cash;
        assert(Math.abs(c.opening + c.direct + c.profit + c.depreciation - c.repayment - c.workingCapitalChange - c.closing) < 0.001, `${chapter.id}/${turn.id}: cash conservation`);
        checked++;
      }
      const choice = options[Math.floor(random() * options.length)];
      state = e.resolveTurn(state, turn, choice.effects, choice.later).state;
    }
  }
  console.log(`${chapter.id}: structure, carry and seeded cash reconciliations passed`);
}
console.log(`${checked} live outcomes checked`);
