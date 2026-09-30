// The continuous season: one board, one business, saved after every committed action.
// season.js decides outcomes; this file shows them and records what the player did.
// Hooks for tests: data-action (commands), data-field (plan controls), data-testid
// (cash, profit, sales, week, event, saved, result).
import { createSeason, step, can, causes, gapParts, WHY, quiet, capacity, hours, committed, needs, facts, goalProgress, eventOptions, stock, replay, SAMPLE, WEEKS, CALC_VERSION } from './season.js';
import { loadStrings, setLanguage, getLanguage, t, localised } from './i18n.js';
import { setCurrency, money, moneySigned, count } from './format.js';
import * as store from './seasonstore.js';
import { drawScene, animateWeek, level, portrait } from './seasonscene.js';

const $ = id => document.getElementById(id);
const P = SAMPLE;
const LANG = 'mv-bs-season-language';
const GUIDE = 'mv-bs-season-controls-seen';
const FILE = location.protocol === 'file:';
const ONLINE = 'https://arnoroh.github.io/business_simulator/';
let content, rec = null, status = 'ok', blocked = false, busy = false, offline = false, legacyFound = false, runs = [];
let shown = null; // What the last action showed. Not stored: the record holds the facts.
let timer = 0;
let lastView = null, motion = false; // The previous stall picture; motion: the last action may animate.
let sheetKey = null; // The stall part whose panel is open.
let resultOpen = true; // The latest week's result card is expanded until the learner moves on.
let counting = 0; // Animation frame of the cash counter during playback.
let saving = Promise.resolve();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sum = list => list.reduce((a, b) => a + b, 0);
const fill = (text, params = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
const ev = (id, ...path) => localised(path.reduce((node, key) => node?.[key], content.events[id]));
const who = id => t(`who.${id}`);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat(9).filter(x => x !== null && x !== undefined && x !== false));
  return el;
}
const btn = (label, action, props = {}) => h('button', { type: 'button', 'data-action': action, class: props.class || 'secondary', ...props }, label);
const rows = pairs => h('dl', { class: 'rows' }, pairs.map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))));

// ---- record lifecycle ---------------------------------------------------------

function newRecord(n) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return { schema: store.SCHEMA, version: store.VERSION, id: crypto.randomUUID(), run: n, seed, calc: CALC_VERSION,
    content: { id: content.id, version: content.version, snapshot: content }, rules: structuredClone(P), startedAt: new Date().toISOString(), rev: 0, log: [], state: createSeason({ seed }) };
}

async function persist() {
  try { rec.rev = await store.save(rec, rec.rev); status = 'ok'; }
  catch (error) { status = error.message === 'conflict' ? 'conflict' : 'failed'; }
  renderStatus();
}

// Apply actions, then save the actions and their result together before showing them.
async function commit(actions) {
  if (busy || blocked || status !== 'ok') return null;
  busy = true;
  let s = rec.state;
  const log = [...rec.log], results = [];
  try {
    for (const action of actions) {
      const out = step(s, action);
      log.push({ n: log.length + 1, at: new Date().toISOString(), week: s.week, language: getLanguage(), phase: s.phase, event: s.pending, automaticHelp: Boolean(document.querySelector('.limit-note')), action, result: out.result });
      shown = feedback(action, out.result, s);
      s = out.state; results.push(out.result);
    }
  } catch { busy = false; render(); return null; }
  rec = { ...rec, state: s, log };
  saving = persist().then(refreshRuns);
  await saving;
  busy = false;
  return results;
}

// Live play and reopening a record show the same facts, translated at render time.
function feedback(action, result, before) {
  if (action.type === 'run') return { kind: 'result', results: [result] };
  if (action.type === 'answer') return { kind: 'outcome', id: before.pending, result, before };
  if (action.type === 'chase') return { kind: 'notice', result };
  if (action.type === 'help') return { kind: 'help' };
  if (action.type === 'why') return { kind: 'result', results: [before.history.at(-1)] };
  return null;
}

const act = action => async () => {
  const results = await commit([action]);
  if (!results) return;
  motion = true;
  render();
};
const plan = (patch) => act({ type: 'plan', patch });

async function runWeeks(until) {
  await saving;
  const actions = [{ type: 'run' }];
  if (!can(rec.state, actions[0])) return;
  let s = step(rec.state, actions[0]).state;
  while (until && quiet(s) && !s.history.at(-1).late.length && !s.history.at(-1).notes.length && actions.length < 8) { actions.push({ type: 'run' }); s = step(s, { type: 'run' }).state; }
  const results = await commit(actions);
  if (!results) return;
  shown = { kind: 'result', results }; resultOpen = true;
  render(reduced());
  play(results.at(-1));
  if (!reduced()) $('scene').scrollIntoView({ block: 'start', behavior: 'auto' });
}

function play(result) {
  const scene = $('scene');
  clearTimeout(timer);
  if (reduced()) return;
  const ms = animateWeek(scene, result, { day: n => t('day', { n }), soldOut: t('soldOut') });
  $('skip').hidden = false;
  timer = setTimeout(stop, ms);
  // The cash counter runs from the week's opening to its closing cash, like the tin.
  const start = performance.now(), span = ms - 500;
  const tick = now => {
    const f = Math.min(1, (now - start) / span);
    $('cash').textContent = count(Math.round((result.cashStart + (result.cashEnd - result.cashStart) * f) / 10) * 10);
    if (f < 1) counting = requestAnimationFrame(tick);
  };
  counting = requestAnimationFrame(tick);
}
function stop() {
  const playing = $('scene').classList.contains('playing');
  clearTimeout(timer); cancelAnimationFrame(counting);
  $('scene').classList.remove('playing'); $('scene').classList.add('done');
  $('skip').hidden = true;
  if (rec) renderTop();
  if (playing) {
    for (const el of document.querySelectorAll('.strip .pill')) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    document.querySelector('#main [data-testid=result]')?.focus();
  }
}

// ---- top: summary strip, calendar, scene ---------------------------------------

function renderTop() {
  const s = rec.state, last = s.history.at(-1);
  // Counters show amounts without the currency code to fit; the full text is the title.
  for (const [id, n] of [['cash', s.cash], ['profit', last?.profit], ['sales', last?.sales]]) {
    $(id).textContent = n === undefined ? '—' : count(n); $(id).title = n === undefined ? '' : money(n);
  }
  $('week').textContent = t(s.week > WEEKS ? 'weekExtra' : 'week', { n: s.week, total: WEEKS });
  $('week').closest('.meta').hidden = !last;
  const due = s.payments.find(p => p.status === 'due');
  $('due').textContent = due ? t('nextDue', { amount: money(due.amount), n: due.due }) : '';
  $('hours').textContent = t('hours', { n: hours(capacity(s), Math.min(s.plan.trays, capacity(s).trays)) });
  const cal = $('calendar'); cal.replaceChildren();
  cal.setAttribute('aria-label', t('calendar'));
  const invoiceWeeks = new Set(s.receivables.map(x => x.due));
  for (let w = 1; w <= WEEKS; w++) {
    const marks = [];
    if (s.payments.some(p => p.status === 'due' && p.due === w)) marks.push('pay');
    if (w === P.awayWeek) marks.push('away');
    if (invoiceWeeks.has(w) && w >= s.week) marks.push('invoice');
    if (w % 4 === 0) marks.push('close');
    cal.append(h('li', { class: [w < s.week ? 'past' : '', w === s.week ? 'now' : '', ...marks].join(' '),
      'aria-current': w === s.week ? 'step' : null, title: marks.map(m => t(`cal.${m}`)).join(', ') || null }, h('span', { text: w })));
  }
  const cap = capacity(s);
  const replaying = shown?.kind === 'result' ? shown.results.at(-1) : null;
  const v = {
    trays: Math.min(s.plan.trays, cap.trays), stock: stock(s), pots: s.pots, helper: !!s.helper, owner: (replaying?.week ?? s.week) !== P.awayWeek,
    queue: last ? Math.round(sum(last.days.map(d => d.demand)) / 6) : P.stallDemand, invoices: s.receivables.length,
    cash: s.cash, office: !!s.office, school: !!s.school, kiosk: !!s.kiosk, rise: s.week >= P.riseWeek,
    rain: last?.days.some(d => d.rain), closed: s.phase === 'closed' || replaying?.away === 'close' || replaying?.away === 'uncovered',
    price: money(P.price[s.plan.price]), notebook: s.notebook,
  };
  const scene = $('scene');
  const prev = motion && !reduced() ? lastView : null;
  motion = false;
  if (!scene.classList.contains('playing')) {
    scene.innerHTML = drawScene(v, prev);
    const fill = scene.querySelector('.tin .fill');
    if (prev && prev.cash !== v.cash) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transform = `scaleY(${level(v.cash)})`; }));
    lastView = v;
  }
  scene.setAttribute('aria-label', t('scene', { pots: s.pots, trays: v.trays, packs: v.stock, papers: v.invoices }));
}

function renderStatus() {
  const saved = $('saved');
  saved.textContent = t(`saved.${status}`);
  saved.className = status === 'ok' ? 'ok' : 'warn';
  $('retry').hidden = status !== 'failed'; $('retry').textContent = t('retry');
  $('reload').hidden = status !== 'conflict'; $('reload').textContent = t('reload');
  $('offline').textContent = t(offline ? 'offline.ready' : 'offline.no');
}

// ---- cards --------------------------------------------------------------------

function eventParams(s) {
  const due = s.payments.find(p => p.status === 'due' && p.due === s.week);
  return {
    amount: money(s.pending === 'flour' ? P.pack + P.rise : s.pending === 'pot' ? P.pot.cost : due?.amount || 0),
    cash: money(s.cash), full: P.school.full, small: P.school.small, pieces: P.kiosk.pieces,
    price: money(s.pending === 'kiosk' ? P.kiosk.price : P.school.price), wage: money(P.wage), skill: s.helperSkill,
    n: s.history.at(-1)?.rejected || 0, paid: s.history.findLast(r => r.trial)?.trial.paid ?? '',
    loan: money(P.loan.amount), fee: money(P.lateFee), flask: money(P.flask.cost), trial: money(P.office.trialCost),
    helperTrial: money(P.helperTrial), training: money(P.training),
  };
}

function eventCard(s) {
  const id = s.pending, params = eventParams(s);
  const card = h('section', { class: 'card event', 'data-testid': 'event', 'data-event': id, id: 'next-step', tabindex: '-1' },
    h('p', { class: 'kicker', text: t('next.event') }),
    h('div', { class: 'event-head' }, h('span', { class: 'portrait' }),
      h('div', { class: 'bubble' }, h('h2', { text: fill(ev(id, 'title'), params) }), h('p', { text: fill(ev(id, 'body'), params) }))));
  card.querySelector('.portrait').innerHTML = portrait(id);
  if (id.startsWith('school')) {
    const need = needs(s, P.school.full);
    card.append(h('div', { class: 'needs' }, h('h3', { text: t('needsTitle') }), h('ul', {},
      h('li', { text: t('needs.trays', { trays: need.trays, cap: need.capacity }) }),
      h('li', { text: t('needs.cash', { amount: money(need.cash), n: need.term }) }),
      h('li', { text: t('needs.hours', { n: need.hours }) }),
      h('li', { text: t('needs.inspection', { amount: money(need.inspection) }) }),
      h('li', { text: t('needs.have', { amount: money(s.cash) }) }))));
  }
  const options = h('div', { class: 'options' });
  for (const option of eventOptions(id)) {
    if (option === 'renegotiate' && !s.school) continue;
    const ok = can(s, { type: 'answer', option });
    options.append(h('button', { type: 'button', class: 'choice', 'data-action': 'answer', 'data-option': option, disabled: !ok,
      onclick: act({ type: 'answer', option }) },
      h('span', { text: fill(ev(id, 'options', option, 'label'), params) }), ok ? null : h('small', { text: t('unavailable') })));
  }
  card.append(options);
  return card;
}

function outcomeCard({ id, result, before }) {
  const params = eventParams(before);
  const extra = result.refused ? 'refused' : result.accepted === true ? 'accepted' : result.accepted === false ? 'declined'
    : id === 'discrepancy' && result.option === 'records' ? (result.found !== undefined ? 'found' : 'unclear') : '';
  return h('section', { class: 'card outcome' }, h('p', { class: 'kicker', text: t('outcomeTitle') }),
    h('h2', { text: fill(ev(id, 'options', result.option, 'label'), params) }),
    result.refused ? null : h('p', { text: fill(ev(id, 'options', result.option, 'outcome'), params) }),
    extra ? h('p', { text: fill(localised(content.extra[extra]), { ...params, n: result.found, sent: result.sent, price: money(P.school.better) }) }) : null);
}

function notes(r) {
  const out = [];
  for (const n of r.notes) out.push([NOTE_ICON[n] || 'paper', n === 'householdShort' ? t('note.householdShort', { amount: money(r.householdShort) }) : t(`note.${n}`)]);
  for (const l of new Set(r.late)) out.push(['clock', t('note.late', { who: who(l) })]);
  if (r.away) out.push(['travel', t('note.away')]);
  if (r.trial) out.push(['office', t('note.trial', r.trial)]);
  for (const c of r.collected) out.push(['coin', t('note.collected', { who: who(c.who), amount: money(c.amount), n: c.from })]);
  for (const i of r.invoices) out.push(['paper', t('note.invoice', { who: who(i.who), amount: money(i.amount), n: i.due })]);
  return out;
}

function resultCard(results, compact = false) {
  const r = results.at(-1);
  const change = r.cashEnd - r.cashStart;
  const lines = notes(r);
  if (compact) {
    const full = resultCard(results);
    full.removeAttribute('data-testid'); full.querySelector('h2').remove();
    const sold = sum(r.days.map(d => d.pieces)) - r.waste - r.rejected;
    const lost = sum(r.days.map(d => Math.max(0, d.demand - d.stall)));
    return h('section', { class: 'card result recap', 'data-testid': 'result', tabindex: '-1', hidden: !resultOpen },
      h('h2', { class: 'ribbon', text: t('result', { n: r.week }) }),
      h('ul', { class: 'tiles', 'aria-label': t('recap.sold', { sold, waste: r.waste }) }, [['coin', sold, 'tile.sold'], ['bin', r.waste, 'tile.waste'], ['leave', lost, 'tile.lost']].map(([key, n, label]) =>
        h('li', { class: key }, pic(key), h('strong', { text: n }), h('span', { text: t(label) })))),
      h('dl', { class: 'receipt' }, [
        ['sales', money(r.sales), t('receipt.sales', { cash: money(r.cashSales), credit: money(r.creditSales) })],
        ['profit', money(r.profit), t('receipt.profit', { sales: money(r.sales), costs: money(sum(Object.entries(r.pnl).filter(([k]) => k !== 'revenue').map(([, v]) => v))) })],
        ['cash', money(r.cashEnd), t('receipt.cash', { start: money(r.cashStart), received: money(sum(Object.values(r.flow).filter(v => v > 0))), paid: money(-sum(Object.values(r.flow).filter(v => v < 0))) })],
      ].map(([key, amount, explanation]) => h('div', {}, h('dt', {}, pic({ sales: 'coin', profit: 'profit', cash: 'money' }[key]), t(key)), h('dd', {}, h('strong', { text: amount }), h('p', { class: 'small', text: explanation }))))),
      h('ul', { class: 'notes' }, lines.slice(0, Math.max(1, r.notes.length + new Set(r.late).size)).map(noteItem)),
      r.week === rec.state.history.at(-1)?.week ? causes(rec.state.history).map(c => whyBox(c, r)) : null,
      h('details', {}, h('summary', { text: t('recap.details') }), full),
      btn(t(`next.${rec.state.phase === 'event' ? 'choice' : rec.state.phase === 'review' ? 'review' : 'plan'}`, { n: rec.state.week }), 'next-step', { class: 'primary', onclick: () => { resultOpen = false; render(); $('next-step')?.focus(); } }));
  }
  const visible = Math.max(3, r.notes.length + new Set(r.late).size);
  const pnlOrder = ['materials', 'chai', 'fee', 'wages', 'interest', 'depreciation', 'other'];
  return h('section', { class: 'card result', 'data-testid': 'result', tabindex: '-1' },
    results.length > 1 ? h('ul', { class: 'weeks' }, results.map(x => h('li', { text: t('weekLine', { n: x.week, sales: money(x.sales), profit: money(x.profit), cash: money(x.cashEnd) }) }))) : null,
    h('h2', { text: t('result', { n: r.week }) }),
    tradingPicture(r),
    h('p', { class: 'tin', text: t('tin', { start: money(r.cashStart), end: money(r.cashEnd) }) }),
    h('p', { class: 'compare', text: t('compare', { profit: money(r.profit), change: moneySigned(change) }) }),
    h('ul', { class: 'notes' }, lines.slice(0, visible).map(noteItem)),
    lines.length > visible ? h('details', {}, h('summary', { text: t('moreResults', { n: lines.length - visible }) }), h('ul', { class: 'notes' }, lines.slice(visible).map(noteItem))) : null,
    h('details', {}, h('summary', { text: t('whereCash') }),
      rows(Object.entries(r.flow).map(([k, v]) => [t(`flow.${k}`), moneySigned(v)]))),
    h('details', {}, h('summary', { text: t('howProfit') }),
      rows([[t('pnl.revenue'), money(r.pnl.revenue || 0)], ...pnlOrder.filter(k => r.pnl[k]).map(k => [t(`pnl.${k}`), moneySigned(-r.pnl[k])]), [t('f.profit'), money(r.profit)]])),
    h('details', {}, h('summary', { text: t('byDay') }), h('ol', {}, r.days.map((d, i) =>
      h('li', { text: t('dayLine', { n: i + 1, made: d.made, sold: d.stall, away: Math.max(0, d.demand - d.stall), waste: d.waste }) })))));
}

// Why it happened, from the saved week. Intro topics show the reasons at once; later
// ones ask first. The pick is recorded as an action; reading an intro is not.
function whyChain(c, r) {
  const made = sum(r.days.map(d => d.pieces)), lost = sum(r.days.map(d => Math.max(0, d.demand - d.stall)));
  const p = { planned: r.planned, wanted: r.wanted, bought: r.bought, short: r.short, lost, cap: r.capacity.trays, by: t(`by.${r.capacity.by}`),
    trays: r.trays, made, demand: sum(r.days.map(d => d.demand)), sold: made - r.waste - r.rejected, waste: r.waste,
    owed: money(r.owedToYou), cash: money(r.cashEnd) };
  if (c.kind === 'held') return [1, 2, 3].map(n => t(`why.c.${c.key}.${n}`, p));
  const g = gapParts(r), f = k => r.flow[k] || 0;
  return [t('why.c.gap', { profit: money(r.profit), change: moneySigned(r.cashEnd - r.cashStart) }), t(`why.c.${c.key}`, {
    credit: money(r.creditSales), collected: money(f('collected')), amount: money(Math.abs(g[c.key])),
    paid: money(-f('supplies') - f('supplier')), used: money(r.pnl.materials || 0) })];
}
function whyBox(c, r) {
  const done = rec.state.whys?.find(w => w.week === c.week && w.kind === c.kind);
  const box = h('section', { class: 'why', 'data-why': c.kind, tabindex: '-1' }, h('p', { class: 'kicker', text: t(!c.ask ? 'why.intro' : done ? 'why.done' : 'why.kicker') }),
    h('h3', { text: t(`why.q.${c.kind}`, { profit: money(r.profit), change: moneySigned(r.cashEnd - r.cashStart) }) }));
  if (c.ask && !done) {
    box.append(h('div', { class: 'options' }, [...WHY[c.kind], 'unsure'].map(k => btn(t(`why.${c.kind}.${k}`), 'why', { class: 'choice', 'data-pick': k,
      onclick: async () => { await act({ type: 'why', kind: c.kind, pick: k })(); $('main').querySelector(`[data-why="${c.kind}"]`)?.focus(); } }))));
    return box;
  }
  if (done && done.pick !== 'unsure') box.append(h('p', { class: `pick ${done.matched ? 'matched' : ''}` }, pic(done.matched ? 'check' : 'cross'),
    h('span', { text: t(done.matched ? 'why.matched' : 'why.other', { pick: t(`why.${c.kind}.${done.pick}`) }) })));
  box.append(h('p', { class: 'answer' }, pic(c.kind === 'held' ? { buy: 'buy', cook: 'cook', plan: 'cook', demand: 'bin', collect: 'collect' }[c.key] : { credit: 'paper', household: 'home', stock: 'buy', other: 'money' }[c.key]),
    h('strong', { text: t(`why.${c.kind}.${c.key}`) })), h('ol', { class: 'chain' }, whyChain(c, r).map(text => h('li', { text }))));
  return box;
}

// The latest result, or a chip that reopens it once the learner has moved on.
function recap(results) {
  const r = results.at(-1);
  return [resultOpen ? null : btn(`${t('result', { n: r.week })} ▸`, 'result-open', { class: 'chip', onclick: () => { resultOpen = true; render(); $('main').querySelector('[data-testid=result]')?.focus(); } }),
    resultCard(results, true)].filter(Boolean);
}

// The fixed game bar holds the trade action; events and reviews carry their own buttons.
function renderBar(s) {
  const bar = $('bar');
  bar.replaceChildren(...(blocked || s.phase !== 'plan' ? [] : [
    btn(h('span', {}, '▶ ', t('run', { n: s.week })), 'run', { class: 'primary go', disabled: status !== 'ok', onclick: () => runWeeks(false) }),
    s.history.length > 0 ? btn(icon('fast'), 'runUntil', { class: 'secondary fast', 'aria-label': t('runUntil'), title: t('runUntil'), disabled: status !== 'ok', onclick: () => runWeeks(true) }) : null,
  ].filter(Boolean)));
}

// Bars show quantities from a completed week, never a forecast or a score.
function splitBar(parts) {
  const total = sum(parts.map(p => p.value));
  return h('div', { class: 'split-bar', 'aria-hidden': 'true' }, parts.map(p =>
    h('span', { class: p.key, style: `flex:${total ? p.value : 0}` })));
}

function tradingPicture(r) {
  const made = sum(r.days.map(d => d.pieces));
  const sold = made - r.waste - r.rejected;
  const lost = sum(r.days.map(d => Math.max(0, d.demand - d.stall)));
  const pieces = [{ key: 'sold', value: sold }, { key: 'waste', value: r.waste }, { key: 'rejected', value: r.rejected }];
  const sales = [{ key: 'paid', value: r.cashSales }, { key: 'credit', value: r.creditSales }];
  return h('div', { class: 'trading-picture' },
    h('p', { class: 'small', text: t('trade.made', { n: made }) }), splitBar(pieces),
    h('div', { class: 'bar-key' }, pieces.filter(p => p.value || p.key === 'sold').map(p => h('span', { class: p.key, text: t(`trade.${p.key}`, { n: p.value }) }))),
    lost ? h('p', { class: 'small', text: t('trade.unfilled', { n: lost }) }) : null,
    h('p', { class: 'small', text: t('trade.sales', { amount: money(r.sales) }) }), splitBar(sales),
    h('div', { class: 'bar-key' }, sales.map(p => h('span', { class: p.key, text: t(`trade.${p.key}`, { amount: money(p.value) }) }))));
}

// The complete audit is learning feedback. It does not fabricate business receipts
// for the notebook mechanic and does not record a view as independent bookkeeping.
function showHistory(week = rec.state.history.at(-1)?.week) {
  if (!week || blocked) return;
  const history = rec.state.history, r = history.find(x => x.week === week);
  if (!r) return;
  stop();
  const dialog = $('history'), body = $('history-body');
  const focusAction = document.activeElement?.dataset.action;
  $('history-title').textContent = t('history.title');
  $('history-close').textContent = t('history.back');
  $('history-close').onclick = () => dialog.close();
  const select = h('select', { id: 'history-week', onchange: e => showHistory(Number(e.target.value)) },
    history.map(x => h('option', { value: x.week, selected: x.week === week, text: t('history.week', { n: x.week }) })));
  body.replaceChildren(h('p', { class: 'small', text: t('history.note') }),
    historyChart(history, week),
    h('div', { class: 'history-controls' },
      btn('←', 'history-prev', { 'aria-label': t('history.prev'), disabled: week === history[0].week, onclick: () => showHistory(week - 1) }),
      h('div', {}, h('label', { for: 'history-week', text: t('history.choose') }), select),
      btn('→', 'history-next', { 'aria-label': t('history.next'), disabled: week === history.at(-1).week, onclick: () => showHistory(week + 1) })),
    rows([[t('f.sales'), money(r.sales)], [t('f.profit'), money(r.profit)], [t('history.cashEnd'), money(r.cashEnd)],
      [t('f.owedToYou'), money(r.owedToYou)], [t('f.owedByYou'), money(r.owedByYou)], [t('history.hours'), r.hours]]),
    historyDecisions(week), resultCard([r]));
  if (!dialog.open) dialog.showModal();
  else (body.querySelector(`[data-action="${focusAction}"]:not(:disabled)`) || select).focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

function historyDecisions(week) {
  let state = createSeason({ seed: rec.seed });
  const choices = [];
  for (const entry of rec.log) {
    if (state.week > week) break;
    const a = entry.action;
    if (state.week === week) {
      if (a.type === 'answer') choices.push(fill(ev(state.pending, 'title'), eventParams(state)) + ' — ' + fill(ev(state.pending, 'options', a.option, 'label'), eventParams(state)));
      if (a.type === 'plan') for (const [key, value] of Object.entries(a.patch)) {
        if (value === state.plan[key]) continue;
        const label = { trays: 'trays', price: 'price', household: 'household', pay: 'payWith', buyWeeks: 'buyFor', check: 'checks' }[key];
        const text = key === 'price' ? money(P.price[value]) : key === 'household' ? money(value) : key === 'trays' ? value : t(`${key}.${value}`);
        choices.push(`${t(label)}: ${text}`);
      }
      if (['buyPot', 'sellPot', 'borrow', 'repay', 'trainHelper', 'endHelper'].includes(a.type)) {
        const amount = { buyPot: P.pot.cost, sellPot: P.pot.resale, borrow: P.loan.amount, repay: state.loan?.balance, trainHelper: P.training }[a.type];
        choices.push(t(a.type, { amount: money(amount) }));
      }
      if (a.type === 'chase') choices.push(t('chase', { who: who(a.who) }));
      if (a.type === 'credit') choices.push(t(a.on ? 'creditOn' : 'creditOff', { who: who(a.who) }));
      if (a.type === 'notebook') choices.push(t(a.on ? 'notebookOn' : 'notebookOff'));
    }
    if (state.week === week && a.type === 'run') break;
    state = step(state, a).state;
  }
  return h('details', { class: 'history-decisions' }, h('summary', { text: t('history.decisions') }),
    choices.length ? h('ul', {}, choices.map(text => h('li', { text }))) : h('p', { text: t('history.unchanged') }));
}

function historyChart(history, week) {
  const keys = ['sales', 'profit', 'cashEnd'];
  const values = history.flatMap(r => keys.map(k => r[k]));
  const lo = Math.min(0, ...values), hi = Math.max(1, ...values);
  const x = i => 12 + i / Math.max(1, history.length - 1) * 276;
  const y = v => 116 - (v - lo) / (hi - lo) * 104;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 300 130'); svg.setAttribute('aria-hidden', 'true');
  const line = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); svg.append(el); };
  line('line', { x1: 12, x2: 288, y1: y(0), y2: y(0), class: 'zero' });
  line('line', { x1: x(week - 1), x2: x(week - 1), y1: 8, y2: 120, class: 'selected-week' });
  for (const key of keys) {
    line('polyline', { points: history.map((r, i) => `${x(i)},${y(r[key])}`).join(' '), class: key });
    line('circle', { cx: x(week - 1), cy: y(history[week - 1][key]), r: 3, class: key });
  }
  return h('figure', { class: 'history-chart' },
    h('figcaption', { text: t('history.range', { first: history[0].week, last: history.at(-1).week }) }),
    h('p', { class: 'small', text: `${money(lo)} — ${money(hi)}` }), svg,
    h('div', { class: 'chart-key' }, keys.map(key => h('span', { class: key, text: t(`history.${key}`) }))));
}

const TILE = { buy: 'buy', pots: 'cook', hours: 'cook', plan: 'cook', demand: 'sell', collect: 'collect' };

function limitCard(s, forced) {
  const last = s.history.at(-1);
  if (!last) return null;
  if (!forced) return null;
  const key = TILE[last.limit];
  return h('div', { class: 'card limit-note', role: 'note' }, h('p', { text: t(`limit.${last.limit || 'none'}`) }),
    key ? btn(t('openPanel', { name: t(`manage.${key}`) }), 'open-panel', { class: 'link', onclick: () => openSheet(key) }) : null);
}

function radios(field, values, current, label) {
  return h('fieldset', { class: 'seg' }, h('legend', { text: label }), values.map(([value, text]) =>
    h('label', {}, h('input', { type: 'radio', name: field, value, 'data-field': field, checked: String(current) === String(value),
      onchange: plan({ [field]: typeof current === 'number' ? Number(value) : value }) }), h('span', { text }))));
}

function stepper(field, value, stepBy, label, min, max) {
  const set = n => plan({ [field]: Math.max(min, Math.min(max, n)) });
  const input = h('input', { type: 'number', id: `f-${field}`, 'data-field': field, value, min, max, step: field === 'household' ? 100 : 1, inputmode: 'numeric' });
  input.onchange = () => { const n = Math.round(Number(input.value) / (field === 'household' ? 100 : 1)) * (field === 'household' ? 100 : 1); if (Number.isFinite(n)) set(n)(); };
  return h('div', { class: 'stepper' }, h('label', { for: `f-${field}`, text: label }),
    h('div', {}, btn('−', 'less', { 'data-for': field, 'aria-label': `${t('less')}: ${label}`, disabled: value <= min, onclick: set(value - stepBy) }),
      input, btn('+', 'more', { 'data-for': field, 'aria-label': `${t('more')}: ${label}`, disabled: value >= max, onclick: set(value + stepBy) })));
}

const ICON = {
  buy: 'M5 21 q-2 -12 7 -14 q9 2 7 14 z M9 7 l3 -3 l3 3', cook: 'M4 10 h16 v7 q0 3 -3 3 h-10 q-3 0 -3 -3 z M2 9 h20',
  sell: 'M12 3 a3.5 3.5 0 1 0 .1 0 z M5 21 v-3 a7 7 0 0 1 14 0 v3', collect: 'M6 3 h12 v18 h-12 z M9 8 h6 M9 12 h6 M9 16 h4',
  money: 'M5 8 h14 v12 h-14 z M5 8 l2 -4 h10 l2 4 M10 13 h4', home: 'M3 10 l9 -6 l9 6 v10 h-18 z M10 20 v-6 h4 v6',
  coin: 'M12 3 a9 9 0 1 0 .1 0 z M12 7 v10 M9 9 h5 M9 15 h5', paper: 'M6 3 h9 l3 3 v15 h-12 z M9 10 h6 M9 14 h6',
  bin: 'M5 7 h14 M9 7 v-3 h6 v3 M6 7 l1 14 h10 l1 -14', leave: 'M9 4 a3 3 0 1 0 .1 0 z M4 21 v-3 a5 5 0 0 1 10 0 v3 M16 12 h6 M19 9 l3 3 l-3 3',
  clock: 'M12 3 a9 9 0 1 0 .1 0 z M12 7 v5 l3 3', cross: 'M12 3 a9 9 0 1 0 .1 0 z M6 6 l12 12',
  school: 'M3 10 l9 -6 l9 6 z M5 10 v10 h14 v-10 M10 20 v-5 h4 v5', kiosk: 'M5 5 h14 l1 4 h-16 z M6 9 v11 h12 v-11',
  office: 'M6 3 h12 v18 h-12 z M9 7 h2 M13 7 h2 M9 11 h2 M13 11 h2 M9 15 h2 M13 15 h2', travel: 'M4 8 h16 v12 h-16 z M9 8 v-3 h6 v3',
  profit: 'M3 12 h7 M6.5 8.5 v7 M14 12 h7', fast: 'M3 6 l8 6 l-8 6 z M12 6 l8 6 l-8 6 z', check: 'M12 3 a9 9 0 1 0 .1 0 z M7 12 l3 3 l7 -7',
};
const NOTE_ICON = { soldOut: 'leave', waste: 'bin', rejected: 'cross', blocked: 'cross', schoolShort: 'school', schoolLost: 'school', kioskShort: 'kiosk', kioskLost: 'kiosk', householdShort: 'home' };
const pic = key => h('span', { class: 'icon', 'aria-hidden': 'true' }, icon(key));
const noteItem = ([key, text]) => h('li', { class: 'pic' }, pic(key), h('span', { text }));

function dailyPlan(s) {
  const cap = capacity(s);
  return h('section', { class: 'card daily-plan', 'data-testid': 'daily-plan' },
    h('h2', { text: t('plan.title', { n: s.week }) }),
    stepper('trays', s.plan.trays, 1, t('trays'), 0, 15),
    h('p', { class: 'small', text: t('plan.pieces', { n: s.plan.trays * (s.small ? P.smallPieces : P.pieces), per: s.small ? P.smallPieces : P.pieces }) }),
    s.plan.trays > cap.trays ? h('p', { class: 'warn', text: t('canCook', { n: cap.trays }) }) : null,
    radios('price', ['low', 'normal', 'high'].map(k => [k, money(P.price[k])]), s.plan.price, t('price')));
}

// The five operating panels. Each opens from its part of the stall picture.
function panels(s) {
  const cap = capacity(s), unit = P.pack + (s.week >= P.riseWeek ? P.rise : 0) - (s.plan.buyWeeks === 2 ? P.bulkOff : 0);
  const owedBakari = sum(s.payables.filter(x => x.who === 'bakari').map(x => x.amount));
  const credit = Object.entries(s.customers);
  const byWho = Object.groupBy ? Object.groupBy(s.receivables, x => x.who) : s.receivables.reduce((m, x) => ((m[x.who] ||= []).push(x), m), {});
  const arrears = s.payables.filter(x => x.who !== 'bakari');
  return {
    buy: [
      h('p', { text: t('stock', { n: stock(s) }) }), h('p', { text: t('packPrice', { amount: money(unit) }) }),
      radios('pay', [['cash', t('pay.cash')], ['credit', t('pay.credit')]], s.plan.pay, t('payWith')),
      radios('buyWeeks', [[1, t('buyWeeks.1')], [2, t('buyWeeks.2')]], s.plan.buyWeeks, t('buyFor')),
      owedBakari ? h('p', { text: t('supplierOwed', { amount: money(owedBakari) }) }) : null,
      s.blocked ? h('p', { class: 'warn', text: t('blocked') }) : null],
    cook: [
      h('p', { text: t('canCook', { n: cap.trays }) + ' ' + t(`by.${cap.by}`) }),
      committed(s) ? h('p', { text: t('ordersNeed', { n: committed(s) }) }) : null,
      h('p', { text: t('pots', { n: s.pots }) }),
      h('div', { class: 'row' }, btn(t('buyPot', { amount: money(P.pot.cost) }), 'buyPot', { disabled: !can(s, { type: 'buyPot' }), onclick: act({ type: 'buyPot' }) }),
        s.equipment.some(e => e.kind === 'pot') ? btn(t('sellPot', { amount: money(P.pot.resale) }), 'sellPot', { onclick: act({ type: 'sellPot' }) }) : null),
      s.helper ? h('p', { text: t('helper', { amount: money(P.wage) }) + (s.helper.training ? ' ' + t('training') : '') }) : null,
      s.helper ? h('div', { class: 'row' }, btn(t('trainHelper', { amount: money(P.training) }), 'trainHelper', { disabled: !can(s, { type: 'trainHelper' }), onclick: act({ type: 'trainHelper' }) }), btn(t('endHelper'), 'endHelper', { onclick: act({ type: 'endHelper' }) })) : null,
      s.helper ? radios('check', ['none', 'batch', 'every'].map(k => [k, t(`check.${k}`)]), s.plan.check, t('checks')) : null],
    sell: [
      h('h4', { text: t('buyers') }), h('ul', {}, h('li', { text: t('ch.stall') }), s.office ? h('li', { text: t('ch.office') }) : null,
        s.school ? h('li', { text: t('ch.school', { n: s.school.pieces }) }) : null, s.kiosk ? h('li', { text: t('ch.kiosk', { n: P.kiosk.pieces }) }) : null,
        credit.filter(([, c]) => c.credit).map(([id]) => h('li', { text: t('ch.credit', { who: who(id) }) })))],
    collect: [
      h('h4', { text: t('owed') }),
      s.receivables.length ? Object.entries(byWho).map(([id, list]) => h('div', { class: 'debtor' },
        h('p', {}, h('strong', { text: who(id) })),
        h('ul', {}, list.map(x => h('li', { text: !x.noted ? t('dueUnknown', { amount: money(x.amount) }) : x.late ? t('dueLate', { amount: money(x.amount), n: x.week + (id === 'school' ? P.school.term : 1) }) : t('due', { amount: money(x.amount), n: x.due }) }))),
        list.some(x => x.due <= s.week) ? btn(t('chase', { who: who(id) }), 'chase', { 'data-who': id, disabled: !can(s, { type: 'chase', who: id }), onclick: act({ type: 'chase', who: id }) }) : null))
        : h('p', { text: t('nobody') }),
      credit.map(([id, c]) => btn(t(c.credit ? 'creditOff' : 'creditOn', { who: who(id) }), 'credit', { 'data-who': id, onclick: act({ type: 'credit', who: id, on: !c.credit }) })),
      h('p', { text: t('notebook') }),
      btn(t(s.notebook ? 'notebookOff' : 'notebookOn'), 'notebook', { 'aria-pressed': String(s.notebook), onclick: act({ type: 'notebook', on: !s.notebook }) })],
    money: [
      stepper('household', s.plan.household, 500, t('household'), 0, 10000),
      s.household.unmet ? h('p', { class: 'warn', text: t('unmet', { amount: money(s.household.unmet) }) }) : null,
      s.loan ? h('p', { text: t('loan', { amount: money(s.loan.balance), principal: money(P.loan.principal), interest: money(P.loan.interest) }) }) : null,
      s.loan ? btn(t('repay', { amount: money(s.loan.balance) }), 'repay', { disabled: !can(s, { type: 'repay' }), onclick: act({ type: 'repay' }) })
        : h('div', {}, btn(t('borrow', { amount: money(P.loan.amount) }), 'borrow', { disabled: !can(s, { type: 'borrow' }), onclick: act({ type: 'borrow' }) }),
          h('p', { class: 'small', text: t('terms', { principal: money(P.loan.principal), interest: money(P.loan.interest) }) })),
      arrears.map(x => h('p', { class: 'warn', text: t('arrears', { who: who(x.who), amount: money(x.amount), n: x.due }) })),
      h('details', {}, h('summary', { text: t('closeBiz') }), btn(t('closeBiz'), 'close', { class: 'danger', onclick: () => confirm(t('closeAsk')) && act({ type: 'close' })() }))],
  };
}

// The stall is the menu: sacks, pots, customers, clipboard and tin open their panel in a
// sheet over the lower screen, so the picture above shows what each action changes.
const SPOTS = ['buy', 'cook', 'collect', 'money', 'sell'];
function renderSpots(highlight) {
  const nav = $('spots'), s = rec.state;
  nav.setAttribute('aria-label', t('spots'));
  nav.hidden = blocked || !['plan', 'event'].includes(s.phase);
  // A red count marks something waiting: debts due to collect, bills or payments due.
  const due = { collect: s.receivables.filter(x => x.due <= s.week).length, money: s.payables.filter(x => x.who !== 'bakari').length + s.payments.filter(p => p.status === 'due' && p.due <= s.week).length };
  nav.replaceChildren(...SPOTS.map(key => h('button', { type: 'button', class: `spot${highlight === key ? ' limit' : ''}`, 'data-spot': key,
    'aria-label': t(`manage.${key}`), title: t(`manage.${key}`), 'aria-haspopup': 'dialog', onclick: () => openSheet(key) },
    h('span', { class: 'badge' }, icon(key), due[key] ? h('b', { class: 'count', text: due[key] }) : null), h('span', { class: 'spot-label', text: t(`spot.${key}`) }))));
  if (nav.hidden && $('sheet').open) $('sheet').close();
}
function openSheet(key) {
  sheetKey = key;
  if (document.querySelector('.stage').getBoundingClientRect().top < 0) scrollTo(0, 0);
  const sheet = $('sheet');
  sheet.style.maxHeight = `${Math.max(innerHeight / 2, innerHeight - document.querySelector('.stage').getBoundingClientRect().bottom - 4)}px`;
  fillSheet();
  if (!sheet.open) sheet.showModal();
  $('sheet-title').focus({ preventScroll: true });
}
function fillSheet() {
  $('sheet-title').replaceChildren(h('span', { class: 'icon', 'aria-hidden': 'true' }, icon(sheetKey)), t(`manage.${sheetKey}`));
  $('sheet-close').textContent = t('sheet.done');
  $('sheet-body').replaceChildren(h('div', { 'data-panel': sheetKey }, panels(rec.state)[sheetKey]));
  if (status !== 'ok') for (const control of $('sheet-body').querySelectorAll('button, input')) control.disabled = true;
}
function icon(key) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', ICON[key]); svg.append(path);
  return svg;
}

function reviewCard(s) {
  const month = (s.week - 1) / 4, season = s.week > WEEKS && !s.finished;
  const period = s.history.slice(-4), f = facts(s), goals = goalProgress(s);
  const threads = s.threads.filter(x => x.week > s.week - 5);
  const card = h('section', { class: 'card review', 'data-testid': 'review', id: 'next-step', tabindex: '-1' },
    h('p', { class: 'kicker', text: t('next.reviewHint') }),
    h('h2', { text: season ? t('seasonReview') : t('review', { n: month }) }),
    rows([
      [t('f.sales'), money(sum(period.map(r => r.sales)))], [t('f.profit'), money(sum(period.map(r => r.profit)))],
      [t('f.cash'), money(f.cash)], [t('f.stock'), `${f.stock} · ${money(f.stockValue)}`],
      [t('f.owedToYou'), money(f.owedToYou)], [t('f.owedByYou'), money(f.owedByYou)], [t('f.hours'), f.hours],
      [t('f.household'), `${f.householdPaid} / ${f.weeks}`], [t('f.unmet'), money(f.householdUnmet + f.paymentsUnmet)],
      ...(season ? [[t('f.business'), f.business], [t('f.away'), f.awayTraded], [t('f.people'), f.people], [t('f.drawings'), money(f.drawings)], [t('f.sales') + ' · ' + WEEKS, money(f.sales)], [t('f.profit') + ' · ' + WEEKS, money(f.profit)]] : []),
    ]),
    threads.length ? h('div', {}, h('h3', { text: t('threads') }), h('ul', {}, threads.map(x => h('li', { text: t(`thread.${x.key}`, {
      ...x, who: x.who ? who(x.who) : '', amount: x.amount !== undefined ? money(x.amount) : '' }) })))) : null,
    h('h3', { text: t('goal') }),
    h('div', { class: 'goals' }, ['income', 'customers', 'away'].map(g => {
      const p = goals[g];
      return h('button', { type: 'button', class: `goal${s.goal === g ? ' chosen' : ''}`, 'data-action': 'goal', 'data-goal': g, 'aria-pressed': String(s.goal === g),
        onclick: act({ type: 'goal', goal: g }) }, h('strong', { text: t(`goal.${g}`) }),
        h('span', { text: t(`goalNow.${g}`, { a: p.now[0], b: p.now[1] ?? '' }) }), p.reached ? h('em', { text: t('reached') }) : null);
    })),
    h('p', { class: 'small', text: t('limits') }),
    btn(t('continue'), 'review', { class: 'primary', onclick: act({ type: 'review' }) }));
  return card;
}

function render(focusResult = false) {
  clearTimeout(timer);
  $('scene').classList.remove('playing');
  $('skip').hidden = true;
  const planOpen = document.querySelector('[data-testid=plan-editor]')?.open;
  const active = document.activeElement;
  const focused = active?.dataset.field ? `[data-field="${active.dataset.field}"]${active.type === 'radio' ? `[value="${active.value}"]` : ''}` : active?.dataset.for ? `[data-action="${active.dataset.action}"][data-for="${active.dataset.for}"]`
    : active?.dataset.action && $('sheet').contains(active) ? `[data-action="${active.dataset.action}"]${active.dataset.who ? `[data-who="${active.dataset.who}"]` : ''}` : null;
  document.title = t('title');
  $('title').textContent = t('title'); $('sub').textContent = t('sub');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  $('lang').textContent = t('otherLang'); $('lang').lang = getLanguage() === 'en' ? 'sw' : 'en';
  $('guide-open').setAttribute('aria-label', t('guide.open')); $('guide-open').title = t('guide.open');
  $('guide-lang').textContent = t('otherLang'); $('guide-lang').lang = $('lang').lang;
  const main = $('main');
  let spotHighlight = '';
  document.body.classList.toggle('opening', !blocked && !rec.state.history.length);
  main.replaceChildren();
  renderStatus();
  if (blocked) {
    $('history-open').hidden = true;
    renderSpots(''); $('bar').replaceChildren();
    main.append(h('section', { class: 'card' }, h('p', { text: t('unreadable') }), btn(t('export'), 'export', { class: 'primary', onclick: exportRecord }),
      btn(t('newRun'), 'new', { onclick: newRun })));
    renderFoot(); return;
  }
  renderTop();
  const s = rec.state;
  $('history-open').hidden = !s.history.length;
  $('history-open').textContent = t('history.open');
  $('history-open').onclick = () => showHistory();
  if (shown?.kind === 'notice') {
    const r = shown.result;
    main.append(h('p', { class: 'card', role: 'status', text: t(r.paid ? 'chasePaid' : 'chaseWaiting', { who: who(r.who), amount: money(r.amount) }) }));
  }
  if (s.phase === 'closed') {
    const f = facts(s);
    main.append(h('section', { class: 'card' }, h('p', { text: t('closed') }),
      rows([[t('f.cash'), money(f.cash)], [t('f.profit'), money(f.profit)], [t('f.owedToYou'), money(f.owedToYou)], [t('f.owedByYou'), money(f.owedByYou)], [t('f.drawings'), money(f.drawings)]]),
      h('p', { class: 'small', text: t('limits') }), btn(t('newRun'), 'new', { class: 'primary', onclick: newRun })));
  }
  else if (s.phase === 'event') {
    if (shown?.kind === 'result') main.append(...recap(shown.results));
    main.append(eventCard(s));
    if (shown?.kind === 'outcome') main.append(outcomeCard(shown));
    main.append(h('details', { 'data-testid': 'plan-editor', open: planOpen }, h('summary', { text: t('plan.change') }), dailyPlan(s)));
  }
  else if (s.phase === 'review') { if (shown?.kind === 'result') main.append(...recap(shown.results)); main.append(reviewCard(s)); }
  else {
    if (shown?.kind === 'result') main.append(...recap(shown.results));
    if (shown?.kind === 'outcome') main.append(outcomeCard(shown));
    if (s.goal) main.append(h('p', { class: 'goal-line', text: t('yourGoal', { goal: t(`goal.${s.goal}`) }) }));
    const forced = shown?.kind === 'help';
    const hint = limitCard(s, forced); if (hint) main.append(hint);
    const last = s.history.at(-1);
    const held = causes(s.history).find(c => c.kind === 'held');
    const shownWhy = held && (!held.ask || s.whys?.some(w => w.week === held.week && w.kind === 'held'));
    const highlight = last && (shownWhy || forced) ? TILE[last.limit] : '';
    const trays = Math.min(s.plan.trays, capacity(s).trays);
    const warn = s.cash < Math.max(0, trays * P.days - stock(s)) * (P.pack + (s.week >= P.riseWeek ? P.rise : 0)) + s.plan.household;
    const daily = dailyPlan(s);
    daily.id = 'next-step'; daily.tabIndex = -1;
    daily.append(h('div', { class: 'run' },
      warn ? h('p', { class: 'warn', role: 'alert', text: t('cashWarning') }) : null,
      h('p', { class: 'small', text: t('plan.trade', { n: P.days }) }),
      s.history.length > 3 ? btn(t('help'), 'help', { class: 'link', onclick: act({ type: 'help' }) }) : null,
      s.history.length > 3 ? h('p', { class: 'small', text: t('helpNote') }) : null));
    main.append(daily);
    spotHighlight = highlight;
  }
  renderSpots(spotHighlight);
  renderBar(s);
  if ($('sheet').open) fillSheet();
  if (focused) (main.querySelector(focused) || $('sheet-body').querySelector(focused))?.focus({ preventScroll: true });
  if (status !== 'ok') for (const control of main.querySelectorAll('button, input')) control.disabled = true;
  renderFoot();
  if (focusResult) main.querySelector('[data-testid="result"]')?.focus({ preventScroll: false });
}

// ---- footer: records, earlier games, offline ------------------------------------

function renderFoot() {
  $('records-tools').textContent = t('recordsTools');
  $('export').textContent = t('export'); $('export').onclick = exportRecord;
  $('runs-title').textContent = t('runs');
  const list = $('runs'); list.replaceChildren();
  for (const r of runs.sort((a, b) => a.run - b.run)) {
    const current = r.id === rec?.id;
    list.append(h('li', {}, h('span', { text: t('runLabel', { n: r.run, w: Math.min(r.week, WEEKS) }) + (current ? ' ✓' : '') }),
      current ? null : btn(t('open'), 'open-run', { onclick: () => openRun(r.id) }),
      current ? null : btn(t('delete'), 'delete-run', { class: 'link', onclick: () => deleteRun(r.id) })));
  }
  list.append(h('li', {}, btn(t('newRun'), 'new', { onclick: newRun })));
  $('earlier-title').textContent = t('earlier');
  $('earlier-found').textContent = legacyFound ? t('earlierFound') : '';
  $('intro-link').textContent = t('intro'); $('intro-link').href = (FILE ? ONLINE : './') + 'intro.html';
  $('chapters-link').textContent = t('chapters'); $('chapters-link').href = (FILE ? ONLINE : './') + 'practice.html';
  $('offline-file').textContent = t('offlineFile'); $('offline-file').hidden = FILE;
  $('sample').textContent = t('sample'); $('draft').textContent = getLanguage() === 'sw' ? t('draft') : '';
  $('privacy').textContent = t('privacy');
  $('skip').textContent = t('skip');
}

function exportRecord() {
  const data = { ...rec, exportedAt: new Date().toISOString(), completion: rec.state?.finished ? 'season-reviewed' : rec.state?.phase === 'closed' ? 'closed-early' : 'partial', level: 'simulated', limitations: { en: content.ui.limits.en, sw: content.ui.limits.sw } };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = h('a', { href: url, download: `MV-BS-SEASON-record-run${rec.run || 0}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function refreshRuns() { try { runs = await store.list(); } catch { runs = rec ? [{ id: rec.id, run: rec.run, week: rec.state.week }] : []; } }

async function newRun() {
  if (status !== 'ok' && rec && !confirm(t('unsavedLeave'))) return;
  if (rec && !blocked && !confirm(t('newRunAsk'))) return;
  await refreshRuns();
  rec = newRecord(Math.max(0, ...runs.map(r => r.run)) + 1);
  blocked = false; shown = null; status = 'ok';
  await persist(); await refreshRuns(); render();
}
async function openRun(id) {
  if (status !== 'ok' && !confirm(t('unsavedLeave'))) return;
  const r = await store.read(id);
  if (!r) return;
  status = 'ok'; load(r); await store.activate(id).catch(() => {}); render();
}
async function deleteRun(id) {
  if (!confirm(t('deleteAsk'))) return;
  await store.remove(id).catch(() => {}); await refreshRuns(); render();
}

// Reopen a saved run only if its actions reproduce its saved state under these rules.
function load(r) {
  rec = r;
  shown = null;
  try {
    blocked = r.schema !== store.SCHEMA || r.version !== store.VERSION || r.content?.id !== content.id || r.content?.version !== content.version || r.calc !== CALC_VERSION;
    if (blocked) return;
    const last = r.log.at(-1), before = replay(r.seed, r.log.slice(0, -1).map(e => e.action));
    const out = last ? step(before, last.action) : { state: before };
    blocked = JSON.stringify(out.state) !== JSON.stringify(r.state);
    if (!blocked && last) shown = feedback(last.action, out.result, before);
  }
  catch { blocked = true; }
}

async function checkOffline() {
  if (FILE) { offline = true; return renderStatus(); }
  if (!('serviceWorker' in navigator) || !self.caches) return;
  await navigator.serviceWorker.ready;
  const files = ['./index.html', './js/game.js', './js/season.js', './js/seasonscene.js', './js/seasonstore.js', './content/season.json', './css/season.css'];
  for (let i = 0; i < 40 && !offline; i++) {
    offline = (await Promise.all(files.map(f => caches.match(f)))).every(Boolean);
    if (!offline) await new Promise(resolve => setTimeout(resolve, 500));
  }
  renderStatus();
}

async function init() {
  const response = await fetch('./content/season.json');
  if (!response.ok) throw new Error('content');
  content = await response.json();
  loadStrings(content.ui); setCurrency(content.currency);
  try { setLanguage(localStorage.getItem(LANG) || localStorage.getItem('asha-language') || 'en'); } catch { setLanguage('en'); }
  $('lang').onclick = () => {
    setLanguage(getLanguage() === 'en' ? 'sw' : 'en');
    try { localStorage.setItem(LANG, getLanguage()); } catch { /* language still works without storage */ }
    render();
  };
  $('guide-lang').onclick = $('lang').onclick;
  $('guide-open').onclick = () => $('guide').showModal();
  const rememberGuide = () => {
    try { localStorage.setItem(GUIDE, '1'); } catch { /* Controls still work without preferences. */ }
  };
  $('guide-close').onclick = () => { rememberGuide(); $('guide').close(); };
  $('guide').addEventListener('cancel', rememberGuide);
  $('guide').addEventListener('close', () => {
    $('guide-open').focus({ preventScroll: true });
  });
  $('retry').onclick = async () => { try { await store.open(); } catch { /* persist shows the error */ } await persist(); render(); };
  $('reload').onclick = () => location.reload();
  $('skip').onclick = stop;
  $('history').addEventListener('close', () => $('history-body').replaceChildren());
  $('sheet-close').onclick = () => $('sheet').close();
  $('sheet').addEventListener('close', () => { const key = sheetKey; sheetKey = null; $('sheet-body').replaceChildren(); document.querySelector(`[data-spot="${key}"]`)?.focus({ preventScroll: true }); });
  // Large text must not let the summary and stall cover the operating controls.
  // Decided by text size, not by measured heights, which change with the mode itself.
  const fitSummary = () => document.body.classList.toggle('tall-summary', parseFloat(getComputedStyle(document.documentElement).fontSize) >= 26);
  new ResizeObserver(fitSummary).observe(document.querySelector('.strip'));
  addEventListener('resize', fitSummary);
  let saved = null;
  try { await store.open(); saved = await store.active(); } catch { status = 'failed'; }
  if (saved) { load(saved); resultOpen = true; }
  else { rec = newRecord(1); await persist(); }
  await refreshRuns();
  legacyFound = await store.legacy();
  render();
  let guideSeen = false;
  try { guideSeen = localStorage.getItem(GUIDE) === '1'; } catch { /* Show the guide without storage. */ }
  if (!blocked && !guideSeen) $('guide').showModal();
  checkOffline().catch(() => {});
}
init().catch(() => { $('main').textContent = 'Could not open the game. Reconnect and reload. / Mchezo haujafunguka. Unganisha intaneti na upakie upya.'; });
