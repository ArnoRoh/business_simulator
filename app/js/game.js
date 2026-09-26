// The continuous season: one board, one business, saved after every committed action.
// season.js decides outcomes; this file shows them and records what the player did.
// Hooks for tests: data-action (commands), data-field (plan controls), data-testid
// (cash, profit, sales, week, event, saved, result).
import { createSeason, step, can, quiet, capacity, hours, committed, needs, facts, goalProgress, eventOptions, stock, replay, SAMPLE, WEEKS, CALC_VERSION } from './season.js';
import { loadStrings, setLanguage, getLanguage, t, localised } from './i18n.js';
import { setCurrency, money, moneySigned } from './format.js';
import * as store from './seasonstore.js';
import { drawScene, animateWeek } from './seasonscene.js';

const $ = id => document.getElementById(id);
const P = SAMPLE;
const LANG = 'mv-bs-season-language';
const FILE = location.protocol === 'file:';
const ONLINE = 'https://arnoroh.github.io/business_simulator/';
let content, rec = null, status = 'ok', blocked = false, busy = false, offline = false, legacyFound = false, runs = [];
let shown = null; // What the last action showed. Not stored: the record holds the facts.
let timer = 0;
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
  await persist();
  await refreshRuns();
  busy = false;
  return results;
}

// Live play and reopening a record show the same facts, translated at render time.
function feedback(action, result, before) {
  if (action.type === 'run') return { kind: 'result', results: [result] };
  if (action.type === 'answer') return { kind: 'outcome', id: before.pending, result, before };
  if (action.type === 'chase') return { kind: 'notice', result };
  if (action.type === 'help') return { kind: 'help' };
  return null;
}

const act = action => async () => {
  const results = await commit([action]);
  if (!results) return;
  render();
};
const plan = (patch) => act({ type: 'plan', patch });

async function runWeeks(until) {
  const actions = [{ type: 'run' }];
  if (!can(rec.state, actions[0])) return;
  let s = step(rec.state, actions[0]).state;
  while (until && quiet(s) && !s.history.at(-1).late.length && !s.history.at(-1).notes.length && actions.length < 8) { actions.push({ type: 'run' }); s = step(s, { type: 'run' }).state; }
  const results = await commit(actions);
  if (!results) return;
  shown = { kind: 'result', results };
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
}
function stop() {
  clearTimeout(timer);
  $('scene').classList.remove('playing'); $('scene').classList.add('done');
  $('skip').hidden = true;
  if (rec) renderTop();
}

// ---- top: summary strip, calendar, scene ---------------------------------------

function renderTop() {
  const s = rec.state, last = s.history.at(-1);
  $('cash').textContent = money(s.cash);
  $('profit').textContent = last ? money(last.profit) : '—';
  $('sales').textContent = last ? money(last.sales) : '—';
  $('week').textContent = t(s.week > WEEKS ? 'weekExtra' : 'week', { n: s.week, total: WEEKS });
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
  };
  const scene = $('scene');
  if (!scene.classList.contains('playing')) scene.innerHTML = drawScene(v);
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
  const card = h('section', { class: 'card event', 'data-testid': 'event', 'data-event': id },
    h('h2', { text: fill(ev(id, 'title'), params) }), h('p', { text: fill(ev(id, 'body'), params) }));
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
  for (const n of r.notes) out.push(n === 'householdShort' ? t('note.householdShort', { amount: money(r.householdShort) }) : t(`note.${n}`));
  for (const l of new Set(r.late)) out.push(t('note.late', { who: who(l) }));
  if (r.away) out.push(t('note.away'));
  if (r.trial) out.push(t('note.trial', r.trial));
  for (const c of r.collected) out.push(t('note.collected', { who: who(c.who), amount: money(c.amount), n: c.from }));
  for (const i of r.invoices) out.push(t('note.invoice', { who: who(i.who), amount: money(i.amount), n: i.due }));
  return out;
}

function resultCard(results) {
  const r = results.at(-1);
  const change = r.cashEnd - r.cashStart;
  const lines = notes(r);
  const visible = Math.max(3, r.notes.length + new Set(r.late).size);
  const pnlOrder = ['materials', 'chai', 'fee', 'wages', 'interest', 'depreciation', 'other'];
  return h('section', { class: 'card result', 'data-testid': 'result', tabindex: '-1' },
    results.length > 1 ? h('ul', { class: 'weeks' }, results.map(x => h('li', { text: t('weekLine', { n: x.week, sales: money(x.sales), profit: money(x.profit), cash: money(x.cashEnd) }) }))) : null,
    h('h2', { text: t('result', { n: r.week }) }),
    tradingPicture(r),
    h('p', { class: 'tin', text: t('tin', { start: money(r.cashStart), end: money(r.cashEnd) }) }),
    h('p', { class: 'compare', text: t('compare', { profit: money(r.profit), change: moneySigned(change) }) }),
    h('ul', { class: 'notes' }, lines.slice(0, visible).map(text => h('li', { text }))),
    lines.length > visible ? h('details', {}, h('summary', { text: t('moreResults', { n: lines.length - visible }) }), h('ul', { class: 'notes' }, lines.slice(visible).map(text => h('li', { text })))) : null,
    h('details', {}, h('summary', { text: t('whereCash') }),
      rows(Object.entries(r.flow).map(([k, v]) => [t(`flow.${k}`), moneySigned(v)]))),
    h('details', {}, h('summary', { text: t('howProfit') }),
      rows([[t('pnl.revenue'), money(r.pnl.revenue || 0)], ...pnlOrder.filter(k => r.pnl[k]).map(k => [t(`pnl.${k}`), moneySigned(-r.pnl[k])]), [t('f.profit'), money(r.profit)]])),
    h('details', {}, h('summary', { text: t('byDay') }), h('ol', {}, r.days.map((d, i) =>
      h('li', { text: t('dayLine', { n: i + 1, made: d.made, sold: d.stall, away: Math.max(0, d.demand - d.stall), waste: d.waste }) })))));
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

function openTile(key) {
  stop();
  const tile = document.querySelector(`[data-tile="${key}"]`);
  if (!tile) return;
  tile.open = true;
  tile.querySelector('summary').focus({ preventScroll: true });
  tile.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
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
  const auto = s.history.length <= 3;
  if (!auto && !forced) return null;
  return h('p', { class: 'card limit-note', role: 'note' }, t(`limit.${last.limit || 'none'}`));
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
  buy: 'M5 20 q-2 -12 7 -14 q9 2 7 14 z', cook: 'M4 10 h16 v7 q0 3 -3 3 h-10 q-3 0 -3 -3 z M2 9 h20',
  sell: 'M12 3 a9 9 0 1 0 .1 0 z M12 7 v10 M9 9 h5 M9 15 h5', collect: 'M6 3 h12 v18 h-12 z M9 8 h6 M9 12 h6 M9 16 h4',
  money: 'M3 10 l9 -6 l9 6 v10 h-18 z M10 20 v-6 h4 v6',
};
function tile(key, limited, ...body) {
  return h('details', { class: `tile${limited ? ' limit' : ''}`, 'data-tile': key },
    h('summary', {}, h('span', { class: 'icon', 'aria-hidden': 'true' }), t(key)), body);
}

function board(s, highlight) {
  const cap = capacity(s), unit = P.pack + (s.week >= P.riseWeek ? P.rise : 0) - (s.plan.buyWeeks === 2 ? P.bulkOff : 0);
  const owedBakari = sum(s.payables.filter(x => x.who === 'bakari').map(x => x.amount));
  const credit = Object.entries(s.customers);
  const byWho = Object.groupBy ? Object.groupBy(s.receivables, x => x.who) : s.receivables.reduce((m, x) => ((m[x.who] ||= []).push(x), m), {});
  const arrears = s.payables.filter(x => x.who !== 'bakari');
  const tiles = [
    tile('buy', highlight === 'buy',
      h('p', { text: t('stock', { n: stock(s) }) }), h('p', { text: t('packPrice', { amount: money(unit) }) }),
      radios('pay', [['cash', t('pay.cash')], ['credit', t('pay.credit')]], s.plan.pay, t('payWith')),
      radios('buyWeeks', [[1, t('buyWeeks.1')], [2, t('buyWeeks.2')]], s.plan.buyWeeks, t('buyFor')),
      owedBakari ? h('p', { text: t('supplierOwed', { amount: money(owedBakari) }) }) : null,
      s.blocked ? h('p', { class: 'warn', text: t('blocked') }) : null),
    tile('cook', highlight === 'cook',
      stepper('trays', s.plan.trays, 1, t('trays'), 0, 15),
      h('p', { text: t('canCook', { n: cap.trays }) + ' ' + t(`by.${cap.by}`) }),
      committed(s) ? h('p', { text: t('ordersNeed', { n: committed(s) }) }) : null,
      h('p', { text: t('pots', { n: s.pots }) }),
      h('div', { class: 'row' }, btn(t('buyPot', { amount: money(P.pot.cost) }), 'buyPot', { disabled: !can(s, { type: 'buyPot' }), onclick: act({ type: 'buyPot' }) }),
        s.equipment.some(e => e.kind === 'pot') ? btn(t('sellPot', { amount: money(P.pot.resale) }), 'sellPot', { onclick: act({ type: 'sellPot' }) }) : null),
      s.helper ? h('p', { text: t('helper', { amount: money(P.wage) }) + (s.helper.training ? ' ' + t('training') : '') }) : null,
      s.helper ? h('div', { class: 'row' }, btn(t('trainHelper', { amount: money(P.training) }), 'trainHelper', { disabled: !can(s, { type: 'trainHelper' }), onclick: act({ type: 'trainHelper' }) }), btn(t('endHelper'), 'endHelper', { onclick: act({ type: 'endHelper' }) })) : null,
      s.helper ? radios('check', ['none', 'batch', 'every'].map(k => [k, t(`check.${k}`)]), s.plan.check, t('checks')) : null),
    tile('sell', highlight === 'sell',
      radios('price', ['low', 'normal', 'high'].map(k => [k, `${t(`price.${k}`)} ${money(P.price[k])}`]), s.plan.price, t('price')),
      h('h4', { text: t('buyers') }), h('ul', {}, h('li', { text: t('ch.stall') }), s.office ? h('li', { text: t('ch.office') }) : null,
        s.school ? h('li', { text: t('ch.school', { n: s.school.pieces }) }) : null, s.kiosk ? h('li', { text: t('ch.kiosk', { n: P.kiosk.pieces }) }) : null,
        credit.filter(([, c]) => c.credit).map(([id]) => h('li', { text: t('ch.credit', { who: who(id) }) })))),
    tile('collect', highlight === 'collect',
      h('h4', { text: t('owed') }),
      s.receivables.length ? Object.entries(byWho).map(([id, list]) => h('div', { class: 'debtor' },
        h('p', {}, h('strong', { text: who(id) })),
        h('ul', {}, list.map(x => h('li', { text: !x.noted ? t('dueUnknown', { amount: money(x.amount) }) : x.late ? t('dueLate', { amount: money(x.amount), n: x.week + (id === 'school' ? P.school.term : 1) }) : t('due', { amount: money(x.amount), n: x.due }) }))),
        list.some(x => x.due <= s.week) ? btn(t('chase', { who: who(id) }), 'chase', { 'data-who': id, disabled: !can(s, { type: 'chase', who: id }), onclick: act({ type: 'chase', who: id }) }) : null))
        : h('p', { text: t('nobody') }),
      credit.map(([id, c]) => btn(t(c.credit ? 'creditOff' : 'creditOn', { who: who(id) }), 'credit', { 'data-who': id, onclick: act({ type: 'credit', who: id, on: !c.credit }) })),
      h('p', { text: t('notebook') }),
      btn(t(s.notebook ? 'notebookOff' : 'notebookOn'), 'notebook', { 'aria-pressed': String(s.notebook), onclick: act({ type: 'notebook', on: !s.notebook }) })),
    tile('money', false,
      stepper('household', s.plan.household, 500, t('household'), 0, 10000),
      s.household.unmet ? h('p', { class: 'warn', text: t('unmet', { amount: money(s.household.unmet) }) }) : null,
      s.loan ? h('p', { text: t('loan', { amount: money(s.loan.balance), principal: money(P.loan.principal), interest: money(P.loan.interest) }) }) : null,
      s.loan ? btn(t('repay', { amount: money(s.loan.balance) }), 'repay', { disabled: !can(s, { type: 'repay' }), onclick: act({ type: 'repay' }) })
        : h('div', {}, btn(t('borrow', { amount: money(P.loan.amount) }), 'borrow', { disabled: !can(s, { type: 'borrow' }), onclick: act({ type: 'borrow' }) }),
          h('p', { class: 'small', text: t('terms', { principal: money(P.loan.principal), interest: money(P.loan.interest) }) })),
      arrears.map(x => h('p', { class: 'warn', text: t('arrears', { who: who(x.who), amount: money(x.amount), n: x.due }) })),
      h('details', {}, h('summary', { text: t('closeBiz') }), btn(t('closeBiz'), 'close', { class: 'danger', onclick: () => confirm(t('closeAsk')) && act({ type: 'close' })() }))),
  ];
  for (const el of tiles) el.querySelector('.icon').append(icon(el.dataset.tile));
  return h('div', { class: 'board' }, tiles);
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
  const card = h('section', { class: 'card review', 'data-testid': 'review' },
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
  const expanded = [...document.querySelectorAll('.tile[open]')].map(el => el.dataset.tile);
  const active = document.activeElement;
  const focused = active?.dataset.field ? `[data-field="${active.dataset.field}"]${active.type === 'radio' ? `[value="${active.value}"]` : ''}` : active?.dataset.for ? `[data-action="${active.dataset.action}"][data-for="${active.dataset.for}"]` : null;
  document.title = t('title');
  $('title').textContent = t('title'); $('sub').textContent = t('sub');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  $('lang').textContent = t('otherLang'); $('lang').lang = getLanguage() === 'en' ? 'sw' : 'en';
  const main = $('main');
  document.body.classList.toggle('trading', !blocked && rec.state.phase === 'plan');
  main.replaceChildren();
  renderStatus();
  if (blocked) {
    $('desk').replaceChildren(); $('history-open').hidden = true;
    main.append(h('section', { class: 'card' }, h('p', { text: t('unreadable') }), btn(t('export'), 'export', { class: 'primary', onclick: exportRecord }),
      btn(t('newRun'), 'new', { onclick: newRun })));
    renderFoot(); return;
  }
  renderTop();
  const s = rec.state;
  const desk = $('desk'); desk.replaceChildren(); desk.setAttribute('aria-label', t('desk'));
  if (s.phase === 'plan' || s.phase === 'event') for (const key of ['buy', 'cook', 'sell', 'collect']) {
    desk.append(btn(t(key), 'open-tile', { 'data-target': key, onclick: () => openTile(key) }));
  }
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
  else if (s.phase === 'event') { if (shown?.kind === 'outcome') main.append(outcomeCard(shown)); if (shown?.kind === 'result') main.append(resultCard(shown.results)); main.append(eventCard(s), board(s, '')); }
  else if (s.phase === 'review') { if (shown?.kind === 'result') main.append(h('details', {}, h('summary', { text: t('result', { n: s.week - 1 }) }), resultCard(shown.results))); main.append(reviewCard(s)); }
  else {
    if (shown?.kind === 'result') main.append(resultCard(shown.results));
    if (shown?.kind === 'outcome') main.append(outcomeCard(shown));
    if (!s.history.length) main.append(h('p', { class: 'small', text: t('goalLine') }));
    if (s.goal) main.append(h('p', { class: 'goal-line', text: t('yourGoal', { goal: t(`goal.${s.goal}`) }) }));
    const forced = shown?.kind === 'help';
    const hint = limitCard(s, forced); if (hint) main.append(hint);
    const last = s.history.at(-1);
    const highlight = last && (s.history.length <= 3 || forced) ? TILE[last.limit] : '';
    const controls = board(s, highlight);
    const trays = Math.min(s.plan.trays, capacity(s).trays);
    const warn = s.cash < Math.max(0, trays * P.days - stock(s)) * (P.pack + (s.week >= P.riseWeek ? P.rise : 0)) + s.plan.household;
    main.append(h('p', { class: 'plan-summary', text: t('standingPlan', { trays: s.plan.trays, price: money(P.price[s.plan.price]), home: money(s.plan.household) }) }));
    main.append(h('div', { class: 'run' },
      warn ? h('p', { class: 'warn', role: 'alert', text: t('cashWarning') }) : null,
      btn(t('run', { n: s.week }), 'run', { class: 'primary', onclick: () => runWeeks(false) }),
      btn(t('runUntil'), 'runUntil', { onclick: () => runWeeks(true) }),
      s.history.length > 3 ? btn(t('help'), 'help', { class: 'link', onclick: act({ type: 'help' }) }) : null,
      s.history.length > 3 ? h('p', { class: 'small', text: t('helpNote') }) : null));
    main.append(controls);
  }
  for (const key of expanded) main.querySelector(`[data-tile="${key}"]`)?.setAttribute('open', '');
  if (focused) main.querySelector(focused)?.focus({ preventScroll: true });
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
  $('retry').onclick = async () => { try { await store.open(); } catch { /* persist shows the error */ } await persist(); render(); };
  $('reload').onclick = () => location.reload();
  $('skip').onclick = stop;
  $('history').addEventListener('close', () => $('history-body').replaceChildren());
  // Large text must not leave the controls trapped between two fixed panels.
  const fitSummary = () => document.body.classList.toggle('tall-summary', document.querySelector('.strip').offsetHeight > innerHeight / 3);
  new ResizeObserver(fitSummary).observe(document.querySelector('.strip'));
  addEventListener('resize', fitSummary);
  let saved = null;
  try { await store.open(); saved = await store.active(); } catch { status = 'failed'; }
  if (saved) load(saved);
  else { rec = newRecord(1); await persist(); }
  await refreshRuns();
  legacyFound = await store.legacy();
  render();
  checkOffline().catch(() => {});
}
init().catch(() => { $('main').textContent = 'Could not open the game. Reconnect and reload. / Mchezo haujafunguka. Unganisha intaneti na upakie upya.'; });
