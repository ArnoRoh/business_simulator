// Financial identities, dated effects and reachable complete seasons; no browser needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSeason, step, can, eventOptions, replay, balance, capacity, hours, facts, goalProgress, SAMPLE as P } from '../app/js/season.js';
const next = (s, type, extra = {}) => step(s, { type, ...extra }).state;
const balanced = s => { const b = balance(s); assert.equal(b.equity, b.expected); assert(s.cash >= 0); };
const fresh = () => createSeason({ seed: 1 });
assert.equal(hours(capacity(fresh()), 4), 42);
let s = next(fresh(), 'borrow');
assert.equal(s.cash, 25000); assert.equal(s.totals.profit, 0); balanced(s);
s = next(s, 'repay'); assert.equal(s.cash, 15000); balanced(s);
s = next(fresh(), 'buyPot'); assert.equal(s.cash, 9000); assert.equal(s.totals.profit, 0); balanced(s);
s = next(s, 'run'); assert.equal(s.history[0].pnl.depreciation, P.pot.dep); balanced(s);
s = next(fresh(), 'plan', { patch: { buyWeeks: 2, household: 0 } });
s = next(s, 'run'); assert(s.packs.length); balanced(s);
assert(s.history[0].bought > s.history[0].days.reduce((n, d) => n + d.made, 0));
// A delivered credit order earns revenue now. Follow-up cannot collect it early.
s = fresh(); s.school = { pieces: 30, strikes: 0 }; s = next(s, 'run');
const invoice = s.receivables[0]; assert.equal(invoice.due, 5); assert(s.history[0].creditSales > 0);
assert(!can(s, { type: 'chase', who: 'school' }));
s.week = 5; s.phase = 'plan'; s.pending = null;
const profit = s.totals.profit, cash = s.cash;
s = next(s, 'chase', { who: 'school' }); assert.equal(s.totals.profit, profit);
assert(s.cash === cash || s.cash === cash + invoice.amount); balanced(s);
// No production and no cash: principal and interest stay payable, not forgiven.
s = fresh(); s = next(s, 'borrow'); s = next(s, 'plan', { patch: { trays: 0, household: 10000 } });
s = next(s, 'run'); s.phase = 'plan'; s.pending = null;
s = next(s, 'run'); s.phase = 'plan'; s.pending = null;
s = next(s, 'run'); assert(s.payables.some(x => x.who === 'lender')); balanced(s);
// An empty stall cannot earn the 'ran without you' observation.
s = fresh(); s.week = 17; s.helper = { skill: 70, trained: true }; s.done.away = 'cover'; s.plan.trays = 0;
s.notebook = true; s.plan.check = 'batch'; s = next(s, 'run'); assert.equal(goalProgress(s).away.reached, false);
// A planned closure keeps customers; uncovered commitments lose orders.
for (const mode of ['close', 'nothing']) {
 s = fresh(); s.week = 17; s.kiosk = { from: 12 }; s.done.away = mode; s = next(s, 'run');
 assert.equal(!!s.kiosk, mode === 'close');
}
// Financial preparation stays available while a payment decision is open.
s = fresh(); s.week = 8; s.phase = 'event'; s.pending = 'payment';
assert(can(s, { type: 'plan', patch: { trays: 5 } })); assert(!can(s, { type: 'run' }));
assert(can(s, { type: 'borrow' }));
s = fresh(); s.helper = { skill: 60, trained: false }; s.payables.push({ who: 'juma', amount: 1000, due: 1 });
s = next(s, 'trainHelper'); assert(s.helper.training && s.helper.trained);
s = next(s, 'endHelper'); assert.equal(s.helper, null); assert(s.payables.some(x => x.who === 'juma'));
s = fresh(); s.office = {}; s.school = {}; s.kiosk = {}; assert.equal(facts(s).business, 0);
const coverage = new Set(); let transitions = 0;
for (let seed = 1; seed <= 300; seed++) {
 s = createSeason({ seed }); const actions = [];
 const apply = a => {
  const before = JSON.stringify(s); const out = step(s, a); assert.equal(JSON.stringify(s), before, 'pure transition');
  s = out.state; actions.push(a); balanced(s); transitions++;
  if (a.type === 'run') { const r = s.history.at(-1); assert.equal(r.cashEnd - r.cashStart, Object.values(r.flow).reduce((a, b) => a + b, 0)); }
 };
 for (let n = 0; n < 160 && s.week <= 24; n++) {
  if (s.phase === 'review') { apply({ type: 'goal', goal: ['income', 'customers', 'away'][seed % 3] }); apply({ type: 'review' }); }
  else if (s.phase === 'event') {
   const options = eventOptions(s.pending).filter(option => can(s, { type: 'answer', option })); assert(options.length);
   const option = options[(seed + n) % options.length]; coverage.add(`${s.pending}:${option}`); apply({ type: 'answer', option });
  } else {
   apply({ type: 'plan', patch: { trays: seed % 15 + 1, price: ['low', 'normal', 'high'][seed % 3], household: seed % 5 * 1000, pay: seed % 2 ? 'cash' : 'credit', buyWeeks: seed % 2 + 1 } });
   apply({ type: 'run' });
  }
 }
 assert.equal(s.history.length, 24); assert.deepEqual(replay(seed, actions), s);
 assert.equal(facts(s).profit, s.history.reduce((n, r) => n + r.profit, 0));
}
const content = JSON.parse(readFileSync(new URL('../app/content/season.json', import.meta.url)));
let strings = 0;
function translated(o, path = '') {
 if (!o || typeof o !== 'object') return;
 if ('en' in o || 'sw' in o) {
  strings++; assert(o.en?.trim() && o.sw?.trim(), path);
  const params = text => [...text.matchAll(/\{\w+\}/g)].map(m => m[0]).sort();
  assert.deepEqual(params(o.en), params(o.sw), path);
 } else for (const [k, v] of Object.entries(o)) translated(v, `${path}.${k}`);
}
translated(content);
for (const event of ['payment', 'office', 'school', 'helper', 'away', 'flour']) assert([...coverage].some(x => x.startsWith(event + ':')), event);
console.log(`Season: 300 complete runs, ${transitions} reconciled transitions, ${coverage.size} event choices, ${strings} bilingual strings; debt, stock, assets, hours and replay passed.`);
