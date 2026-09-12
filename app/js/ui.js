// Rendering. One decision per screen (docs/game-design.md, "Interface constraints").
//
// All text goes in via textContent, never innerHTML — scenario content is data and
// must never become markup. All text comes from i18n, never a literal in this file
// (docs/localization.md rule 1).

import { money, moneySigned, count, proportion } from './format.js';
import {
  weeklyPnl, ownerLoad, project, applyEffects,
  resolveNumberInput, allocationTotal, weeklyCashFlow, readField,
  workingCapital, netWorth, gearing,
} from './engine.js';
import { t, tCount, localised } from './i18n.js';
import { drawScene, drawChart, animateNumber, pulse } from './scene.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Grow a bar from zero on the next frame, so the width transition actually runs. */
function growBar(bar, fraction) {
  bar.style.width = '0%';
  requestAnimationFrame(() => {
    bar.style.width = `${Math.max(0, Math.min(100, fraction * 100))}%`;
  });
}

function localisedTemplate(value, params = {}) {
  return localised(value).replace(/\{(\w+)\}/g, (whole, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole
  ));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * A number the learner picked, as they should read it back.
 *
 * `unit` is authored per input, because only content knows whether 150 is loaves, weeks
 * or people. Without it a change input reads as a bare "-150" on the stepper and again
 * on the work-it-out card — a number with no noun, which is the one thing a ledger is
 * supposed to never be.
 */
function decisionValue(value, valueAs, unit) {
  // Count is the exception and money is the default, matching decisionLabel() in
  // main.js. The other way round, an unrecognised `valueAs` silently dropped the
  // currency: chapter 4 authors "currency" on its two price steppers, so the control
  // read "1,700" while the work-it-out card one screen later read "TZS 1,700".
  const shown = valueAs === 'count' ? count(value) : money(value);
  const noun = localised(unit);
  return noun ? t('num.withUnit', { value: shown, unit: noun }) : shown;
}

function fieldValue(value, field) {
  return ['cash', 'price', 'unitCost', 'rent', 'licenceFees', 'wagePerStaff'].includes(field)
    ? money(value)
    : count(value);
}

function numberDelta(raw) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function stepButton(step, textKey, labelKey) {
  const button = el('button', 'stepper-button', t(textKey));
  button.type = 'button';
  button.dataset.step = step > 0 ? `+${step}` : String(step);
  button.setAttribute('aria-label', t(labelKey));
  return button;
}

function updateStepperValue(root, valueNode, previous, value, format) {
  root.dataset.value = String(value);
  // The value readout is a test and accessibility surface, so it must become the
  // current formatted value synchronously. pulse supplies movement feedback without
  // making a learner wait for an animation to know what they selected.
  valueNode.textContent = format(value);
  pulse(valueNode);
}

function feedbackFieldKey(field) {
  return {
    demand: 'num.field.demand',
    capacity: 'num.field.capacity',
    staff: 'num.field.staff',
    cash: 'num.field.cash',
    reputation: 'num.field.reputation',
    hygiene: 'num.field.hygiene',
    ownerHours: 'num.field.ownerHours',
  }[field] || 'num.field.other';
}

function appendNumberFeedback(card, state, input, value) {
  const feedback = el('div', 'number-feedback');
  let hasFeedback = false;
  const effects = resolveNumberInput(state, input, value);

  for (const response of input.responses || []) {
    const delta = numberDelta(effects[response.field]);
    if (delta === 0) continue;
    const current = Number(readField(state, response.field)) || 0;
    const label = t(feedbackFieldKey(response.field));
    const line = response.field === 'demand' && delta < 0
      ? t('num.customersLost', { n: count(Math.abs(delta)) })
      : response.field === 'demand' && delta > 0
        ? t('num.customersGained', { n: count(delta) })
        : t('num.response', {
          field: label,
          change: fieldValue(delta, response.field),
          value: fieldValue(current + delta, response.field),
        });
    feedback.appendChild(el('p', 'number-feedback-line', line));
    hasFeedback = true;
  }

  // A price is two numbers multiplied, and the multiplication is the part that is hard
  // to hold in your head. Show it — but stop at the gross, before rent and wages, so
  // the profit prediction that follows is still the learner's own arithmetic.
  //
  // Matched by field name rather than by the exact string 'price', so a chapter that
  // prices one product line (`lines.export.price`) gets the same help as chapter 1
  // pricing its only product. Without that, the turns where the arithmetic is hardest
  // were the ones showing none of it.
  if (/(^|\.)price$/.test(String(input.field))) {
    const after = weeklyPnl(applyEffects(state, effects));
    const unitCostField = String(input.field).replace(/price$/, 'unitCost');
    const product = String(input.field).startsWith('lines.') ? after.perLine.find(line => line.id === input.field.split('.')[1]) : after;
    feedback.appendChild(el('p', 'number-feedback-line keep', t('num.grossPerWeek', {
      units: count(product.unitsSold),
      kept: money(value - Number(readField(state, unitCostField) || 0)),
      gross: money(product.revenue - product.variableCost),
    })));
    hasFeedback = true;
  }

  if (!hasFeedback) feedback.appendChild(el('p', 'number-feedback-line', t('num.resultLater')));
  card.appendChild(feedback);
}

function renderStepper(root, valueNode, value, min, max, step, format, onChange) {
  const buttons = [];

  // A button that cannot move the value says so, rather than silently doing nothing.
  // A learner who presses a live-looking button twice and sees no change concludes the
  // control is broken, not that they are at the end of the range.
  const syncButtons = () => {
    for (const { button, amount } of buttons) {
      button.disabled = clampNumber(value + amount, min, max) === value;
    }
  };

  const applyStep = (amount) => {
    const previous = value;
    const next = clampNumber(previous + amount, min, max);
    if (next === previous) return;
    value = next;
    updateStepperValue(root, valueNode, previous, value, format);
    syncButtons();
    const entry = root.querySelector('.number-entry');
    if (entry) {
      entry.value = value; entry.setCustomValidity(''); entry.setAttribute('aria-invalid', 'false');
      root.querySelector('.number-error').hidden = true;
      const commit = root.querySelector('[data-role="commit"]'); if (commit) commit.disabled = false;
    }
    onChange(value, previous);
  };

  for (const amount of [-step, step]) {
    const button = stepButton(
      amount / step,
      amount < 0 ? 'num.decrease' : 'num.increase',
      amount < 0 ? 'num.decreaseLabel' : 'num.increaseLabel',
    );
    button.addEventListener('click', () => applyStep(amount));
    buttons.push({ button, amount });
    root.querySelector('.stepper-controls').appendChild(button);
  }

  const input = el('input', 'number-entry');
  input.type = 'number'; input.inputMode = 'decimal'; input.min = min; input.max = max; input.step = 'any'; input.value = value;
  input.setAttribute('aria-label', t('num.entry'));
  const error = el('p', 'number-error'); error.hidden = true; error.setAttribute('role', 'alert');
  error.id = `${root.dataset.control}-range`; input.setAttribute('aria-describedby', error.id);
  input.addEventListener('input', () => {
    const valid = !input.validity.stepMismatch && input.value.trim() !== '' && Number.isFinite(Number(input.value)) && Number(input.value) >= min && Number(input.value) <= max;
    input.setCustomValidity(valid ? '' : input.validity.stepMismatch ? t('num.whole') : t('num.range', { min: format(min), max: format(max) }));
    input.setAttribute('aria-invalid', String(!valid));
    error.textContent = input.validationMessage; error.hidden = valid;
    const commit = root.querySelector('[data-role="commit"]');
    if (commit) commit.disabled = !valid;
    if (!valid) return;
    applyStep(Number(input.value) - value);
    onChange(value, value);
  });
  root.querySelector('.stepper-controls').appendChild(input);
  root.appendChild(error);
  syncButtons();
  return () => value;
}

// --- top bar -------------------------------------------------------------

export function renderStats(container, state, prevState) {
  clear(container);
  const pnl = weeklyPnl(state);
  const load = ownerLoad(state);

  const row = el('div', 'stat-row');
  const tiles = [
    { key: 'stat.cash', value: money(state.cash), raw: state.cash, fmt: money, negative: state.cash < 0 },
    { key: 'stat.sold', value: count(pnl.unitsSold), raw: pnl.unitsSold, fmt: count },
  ];

  for (const tile of tiles) {
    const node = el('div', 'stat');
    node.appendChild(el('div', 'stat-label', t(tile.key)));
    const value = el('div', `stat-value${tile.negative ? ' negative' : ''}`, tile.value);
    node.appendChild(value);
    row.appendChild(node);

    // Animate only when a number actually moved, so movement means something.
    if (prevState) {
      const prevPnl = weeklyPnl(prevState);
      const before = tile.key === 'stat.profit' ? prevPnl.profit
        : tile.key === 'stat.cash' ? prevState.cash
          : tile.key === 'stat.week' ? prevState.week
            : prevPnl.unitsSold;
      if (before !== tile.raw) {
        animateNumber(value, before, tile.raw, { duration: 600, format: tile.fmt });
      }
    }
  }
  container.appendChild(row);

  // Owner time. Previously this only appeared once already overloaded, which meant the
  // learner never saw it coming — the whole point is that it creeps up on you.
  const time = el('div', `time-bar${load.overloaded ? ' over' : ''}`);
  const head = el('div', 'time-head');
  head.appendChild(el('span', 'time-label', t('stat.time')));
  head.appendChild(el('span', 'time-value',
    load.overloaded
      ? t('stat.timeOver')
      : t('stat.timeOf', { used: Math.round(load.used), total: Math.round(load.total) })));
  time.appendChild(head);

  const track = el('div', 'time-track');
  const fill = el('div', 'time-fill');
  track.appendChild(fill);
  time.appendChild(track);
  container.appendChild(time);
  growBar(fill, Math.min(1, load.fraction));
}

// --- the ledger ----------------------------------------------------------

/**
 * The weekly P&L as rows. Money in is positive, money out is negative, so a row's
 * sign always matches the direction it moves the business.
 */
function ledgerRows(pnl) {
  return [
    { key: 'pnl.sales', value: pnl.revenue, dir: 'in' },
    { key: 'pnl.costOfSales', value: -pnl.variableCost, dir: 'out' },
    { key: 'pnl.rent', value: -pnl.rent, dir: 'out' },
    { key: 'pnl.wages', value: -pnl.wages, dir: 'out', hideIfZero: true },
    { key: 'pnl.fees', value: -pnl.licenceFees, dir: 'out', hideIfZero: true },
    { key: 'pnl.spoilage', value: -pnl.spoilage, dir: 'out', hideIfZero: true },

    // Chapters 2-4 (D-017). Every one of these is zero under chapter 1's state, so
    // that ledger is unchanged — a row appears only once the business has the thing
    // it describes.
    {
      key: pnl.fxEffect >= 0 ? 'pnl.fxGain' : 'pnl.fxLoss',
      value: pnl.fxEffect,
      dir: pnl.fxEffect >= 0 ? 'in' : 'out',
      hideIfZero: true,
    },
    { key: 'pnl.freight', value: -pnl.freight, dir: 'out', hideIfZero: true },
    { key: 'pnl.duty', value: -pnl.duty, dir: 'out', hideIfZero: true },
    { key: 'pnl.depreciation', value: -pnl.depreciation, dir: 'out', hideIfZero: true },
    { key: 'pnl.interest', value: -pnl.interest, dir: 'out', hideIfZero: true },
  ].filter((r) => !(r.hideIfZero && r.value === 0));
}

/**
 * A product line's name for the panel.
 *
 * Scenario content supplies `lines[].label` as a localised pair like everything else.
 * A line without one falls back to its id, which is not a UI string and so is not an
 * i18n violation — it is content the author forgot to name, and showing it is how they
 * find out.
 */
function lineLabel(state, id) {
  const line = (state.lines || []).find((candidate) => candidate.id === id);
  return localised(line && line.label) || id;
}

function ledgerRow(row, scale) {
  const node = el('div', `ledger-row ${row.dir}`);
  node.appendChild(el('div', 'ledger-label', t(row.key)));

  const bar = el('div', 'ledger-bar');
  const fill = el('div', `ledger-fill ${row.dir}`);
  bar.appendChild(fill);
  node.appendChild(bar);

  node.appendChild(el('div', `ledger-value${row.value < 0 ? ' negative' : ''}`, money(row.value)));
  growBar(fill, scale > 0 ? Math.abs(row.value) / scale : 0);
  return node;
}

// The five lines every business in this game has from its first week: what it sold,
// what the goods cost, rent, wages, and licences and fees — which also carries what a
// business pays someone to keep its books. They are the ledger a mandazi stall has, and
// they are not explained.
//
// Everything else is a line that arrives because the business changed — an oven that
// wears out, a loan that charges interest, a container that pays duty. `arc.md` §3 says
// the advanced concepts are taught "by cash and profit visibly diverging in the panel
// the learner already reads, not by a working-capital slider". That only works if the
// learner is told what the new line is the first time they meet it. Before this, a row
// for depreciation simply appeared, in a chapter where nothing on screen used the word.
const LEDGER_BASICS = ['pnl.sales', 'pnl.costOfSales', 'pnl.rent', 'pnl.wages', 'pnl.fees'];

/**
 * The always-on money panel: what came in, what went out, what is left.
 *
 * Grouped and barred rather than listed, because magnitude has to be visible and not
 * just readable — docs/localization.md, "Numbers".
 *
 * `seen` is the lines this learner has already had explained. Pass `null` to explain
 * nothing. Returns the advanced lines on screen now, so the caller can mark them seen
 * once the turn is over — the explanation stays up for the whole turn it arrived in,
 * including the reveal, and does not come back.
 */
export function renderPnl(container, state, seen = null, prevState = null) {
  clear(container);
  const pnl = weeklyPnl(state);
  const rows = ledgerRows(pnl);
  const scale = Math.max(...rows.map((r) => Math.abs(r.value)), 1);

  const card = el('div', 'ledger');

  const inRows = rows.filter((r) => r.dir === 'in');
  const outRows = rows.filter((r) => r.dir === 'out');

  card.appendChild(el('div', 'ledger-group-title', t('pnl.moneyIn')));
  for (const r of inRows) card.appendChild(ledgerRow(r, scale));

  card.appendChild(el('div', 'ledger-group-title', t('pnl.moneyOut')));
  for (const r of outRows) card.appendChild(ledgerRow(r, scale));

  const total = el('div', `ledger-row total${pnl.profit < 0 ? ' negative' : ''}`);
  total.appendChild(el('div', 'ledger-label',
    t(pnl.profit < 0 ? 'pnl.lossThisWeek' : 'pnl.profitThisWeek')));
  total.appendChild(el('div', 'ledger-bar'));
  total.appendChild(el('div', `ledger-value${pnl.profit < 0 ? ' negative' : ''}`, money(pnl.profit)));
  card.appendChild(total);

  // What the week earned and what actually reaches the bank are different numbers as
  // soon as there is an asset, a loan or a credit term (D-017). This is the whole
  // lesson of chapters 2 and 3, and it is taught by putting the two figures next to
  // each other in the panel the learner already reads — not by a new control.
  const flow = weeklyCashFlow(state);
  if (flow.cashFlow !== pnl.profit) {
    const cashRow = el('div', `ledger-row total cash-flow${flow.cashFlow < 0 ? ' negative' : ''}`);
    cashRow.appendChild(el('div', 'ledger-label', t('pnl.reachesTheBank')));
    cashRow.appendChild(el('div', 'ledger-bar'));
    cashRow.appendChild(el('div', `ledger-value${flow.cashFlow < 0 ? ' negative' : ''}`,
      money(flow.cashFlow)));
    card.appendChild(cashRow);
  }

  container.appendChild(card);

  if (flow.cashFlow !== pnl.profit) {
    const parts = [];
    if (flow.depreciation) parts.push(t('pnl.why.depreciation', { amount: money(flow.depreciation) }));
    if (flow.repayment) parts.push(t('pnl.why.repayment', { amount: money(flow.repayment) }));
    container.appendChild(el('div', `pnl-note${flow.cashFlow < 0 && pnl.profit > 0 ? ' warn' : ''}`,
      parts.length ? parts.join(' ') : t('pnl.why.workingCapital')));
  }

  // Per-line contribution, once there is more than one product. "Which of these
  // actually earns" is not answerable from a blended margin, and answering it is the
  // point of the mix decisions in chapter 2.
  if (pnl.perLine.length > 1) {
    const mix = el('div', 'ledger mix');
    mix.appendChild(el('div', 'ledger-group-title', t('pnl.byProduct')));
    const best = Math.max(...pnl.perLine.map((l) => Math.abs(l.contribution)), 1);
    for (const line of pnl.perLine) {
      const row = el('div', 'ledger-row in');
      row.appendChild(el('div', 'ledger-label', lineLabel(state, line.id)));
      const bar = el('div', 'ledger-bar');
      const fill = el('div', 'ledger-fill in');
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'ledger-value',
        `${money(line.contribution)} · ${Math.round(line.margin * 100)}%`));
      growBar(fill, Math.abs(line.contribution) / best);
      mix.appendChild(row);
    }
    container.appendChild(mix);
  }

  // Per-unit economics. This used to appear only for the first four turns; it is the
  // single most reusable idea in the whole scenario, so it stays on screen.
  if (pnl.unitsSold > 0 && pnl.perLine.length === 1) {
    container.appendChild(el('div', 'pnl-note', t('pnl.perUnit', {
      price: money(state.price),
      cost: money(state.unitCost),
      kept: money(state.price - state.unitCost),
    })));
  }

  if (pnl.unmetDemand > 0) {
    container.appendChild(el('div', 'pnl-note warn',
      tCount('pnl.unmet', pnl.unmetDemand, { n: count(pnl.unmetDemand) })));
  }

  // Concrete comparison rather than an abstract ratio — docs/localization.md.
  const weeklyFixed = pnl.fixedCost;
  if (weeklyFixed > 0 && state.cash > 0) {
    const weeks = Math.floor(state.cash / weeklyFixed);
    if (weeks <= 12) {
      container.appendChild(el('div', `pnl-note${weeks <= 3 ? ' warn' : ''}`,
        tCount('pnl.cashRunway', weeks, { n: count(weeks) })));
    }
  }

  // What the business is WORTH, under everything the week did to it.
  //
  // The panel above is a week. This is the only figure in the game that accumulates,
  // and it is the one an owner of a real firm lives by (D-030). It sits under the
  // weekly rows rather than above them because the week is what the turn is about; the
  // stock is what the week added to or took from.
  const worth = netWorth(state);
  const worthBefore = prevState ? netWorth(prevState) : null;
  const card2 = el('div', 'worth');
  card2.appendChild(el('div', 'ledger-group-title', t('worth.title')));

  const worthRow = el('div', `worth-row${worth < 0 ? ' negative' : ''}`);
  worthRow.appendChild(el('div', 'worth-label', t('worth.owned')));
  worthRow.appendChild(el('div', `worth-value${worth < 0 ? ' negative' : ''}`, money(worth)));
  card2.appendChild(worthRow);

  // The change is the point, not the level. A learner cannot tell whether 3,450,000 is
  // good; they can tell whether it went up while they were running the place.
  if (worthBefore !== null && worthBefore !== worth) {
    const moved = worth - worthBefore;
    card2.appendChild(el('div', `worth-change${moved < 0 ? ' negative' : ''}`,
      t(moved < 0 ? 'worth.fell' : 'worth.grew', { amount: money(Math.abs(moved)) })));
  }

  // Gearing, only once there is a lender to have a claim. Said as a comparison rather
  // than as a ratio — docs/localization.md.
  const geared = gearing(state);
  if (geared.owed > 0) {
    if (geared.share === null) {
      card2.appendChild(el('div', 'worth-note warn', t('worth.owesMoreThanOwns')));
    } else {
      card2.appendChild(el('div', `worth-note${geared.outweighed ? ' warn' : ''}`,
        t('worth.lenderShare', { amount: money(Math.round(geared.share * 100)) })));
      if (geared.outweighed) {
        card2.appendChild(el('div', 'worth-note warn', t('worth.outweighed')));
      }
    }
  }
  container.appendChild(card2);

  // What is new in this ledger, and what it means. One sentence each, once.
  const advanced = rows.map((r) => r.key).filter((key) => !LEDGER_BASICS.includes(key));

  // The worth block introduces itself the same way a new ledger line does, and once.
  // It is the largest new idea the panel has ever gained, and a figure a learner has
  // not been shown before is exactly what D-025 exists for.
  advanced.push('pnl.worth');
  if (geared.owed > 0) advanced.push('pnl.gearing');
  if (seen) {
    const arrivals = advanced.filter((key) => !seen.includes(key));
    if (arrivals.length) {
      const card = el('div', 'pnl-new');
      card.appendChild(el('div', 'pnl-new-title', t('pnl.newTitle')));
      for (const key of arrivals) {
        card.appendChild(el('p', 'pnl-new-line', t(`pnl.new.${key.replace(/^pnl\./, '')}`)));
      }
      container.appendChild(card);
    }
  }
  return advanced;
}

/**
 * Where this is heading if nothing changes.
 *
 * The slow variables move too little in one week to notice, which is precisely why
 * neglect compounds unnoticed. This makes the trend legible without claiming to
 * predict anything real.
 */
export function renderTrajectory(container, state) {
  clear(container);
  const ahead = project(state, 12);

  const card = el('div', 'trajectory');
  card.appendChild(el('div', 'trajectory-title', t('trajectory.title')));
  card.appendChild(el('div', 'trajectory-cash', t('trajectory.cash', {
    weeks: count(12),
    amount: money(ahead.cash),
  })));

  const change = ahead.cash - ahead.cashNow;
  const direction = change > Math.abs(ahead.cashNow) * 0.05 ? 'rising'
    : change < -Math.abs(ahead.cashNow) * 0.05 ? 'falling' : 'flat';
  card.appendChild(el('div', `trajectory-note ${direction}`, t(`trajectory.${direction}`)));

  const chart = el('div', 'trajectory-chart');
  card.appendChild(chart);
  container.appendChild(card);
  drawChart(chart, ahead.weekly);
}

// --- turn phases ---------------------------------------------------------

/**
 * `notes` are the lines a carried flag contributed to the opening (ADR-0007) — "you
 * came here keeping proper books, and the bank manager can see that". They appear on
 * the first turn only, because after that the learner is in this chapter's story.
 */
export function renderSituation(container, turn, notes = []) {
  clear(container);
  const card = el('div', 'situation-card');
  card.appendChild(el('p', 'situation', localised(turn.situation)));
  if (localised(turn.situationDetails) || notes.length) {
    const more = el('details', 'situation-context');
    more.appendChild(el('summary', null, t('situation.more')));
    more.appendChild(el('p', null, localised(turn.situationDetails)));
    if (turn.id === 't01') for (const note of notes) more.appendChild(el('p', 'carry-note', localised(note)));
    card.appendChild(more);
  }
  container.appendChild(card);
  return card;
}

/**
 * The chapter select (ADR-0007).
 *
 * Nothing is locked. A finished chapter is marked as finished and that is all it does
 * — no percentage, no score, no "next recommended" (ADR-0004). The one thing the
 * screen must say plainly is that stopping after chapter 1 is a complete outcome, not
 * a failure to progress: `AGENTS.md` section 2 and Q-006.
 */
export function renderChapterSelect(intro, container, chapters, carry, onOpen) {
  clear(intro);
  clear(container);

  const head = el('div', 'welcome');
  head.appendChild(el('p', 'eyebrow', t('play.welcome')));
  head.appendChild(el('h2', null, t('chapter.selectTitle')));
  head.appendChild(el('p', null, t('chapter.selectIntro')));
  intro.appendChild(head);

  const list = el('div', 'chapter-list');
  for (const chapter of chapters) {
    const done = (carry.completed || []).includes(chapter.id);
    const btn = el('button', `chapter-card${done ? ' done' : ''}`);
    btn.type = 'button';
    const art = el('span', 'chapter-art'); art.setAttribute('aria-hidden', 'true');
    drawScene(art, { 'mama-asha': 'stall-small', bakery: 'bakery', factory: 'factory', export: 'export' }[chapter.id], { cash: 150000, demand: 180, capacity: 200, staff: chapter.id === 'mama-asha' ? 0 : 2 });
    btn.appendChild(art);
    const words = el('span', 'chapter-words'); btn.appendChild(words);
    words.appendChild(el('span', 'chapter-title', localised(chapter.title)));
    words.appendChild(el('span', 'chapter-shift', localised(chapter.shift)));
    words.appendChild(el('span', 'chapter-play', t(done ? 'chapter.finished' : 'play.open')));
    // Not `forceNew`. Leaving a chapter to look at the list is something a learner does
    // by accident on a shared phone, and this threw the run away: fifteen turns of the
    // bakery, gone, with no warning and no way back. `start()` decides — an unfinished
    // run of this chapter resumes, anything else begins.
    btn.addEventListener('click', () => onOpen(chapter.id));
    list.appendChild(btn);
  }
  container.appendChild(list);
  container.appendChild(el('p', 'chapter-note', t('chapter.notALadder')));
}

export function renderInfo(container, turn, state, onSeek, sought) {
  clear(container);
  if (!turn.info || turn.info.length === 0) return;

  const card = el('details', 'research');
  card.open = sought.size > 0;
  card.appendChild(el('summary', null, t('info.title')));
  const list = el('div', 'info-list');

  for (const item of turn.info) {
    const used = sought.has(item.id);
    const btn = el('button', `info-item${used ? ' used' : ''}`);
    btn.type = 'button';
    btn.appendChild(el('span', 'info-label', localised(item.label)));

    if (used) {
      const reveals = el('span', 'info-reveals', localised(item.reveals));
      btn.appendChild(reveals);
      btn.disabled = true;
      reveals.classList.add('slide-up');
    } else {
      const cost = [];
      if (item.costHours) cost.push(t('info.costHours', { n: item.costHours }));
      if (item.costCash) cost.push(money(item.costCash));
      if (cost.length) btn.appendChild(el('span', 'info-cost', cost.join(' · ')));
      btn.addEventListener('click', () => onSeek(item));
    }
    list.appendChild(btn);
  }

  card.appendChild(list);
  container.appendChild(card);
}

/**
 * Which parts of the business a choice touches — never how much.
 *
 * Naming the dimensions makes the trade-off legible ("this costs time as well as
 * money") without giving away the size, which is what the learner is about to predict.
 */
export function renderNumberDecision(container, turn, state, onCommit, draft = null, onDraft = () => {}) {
  clear(container);
  const decision = turn.decision;
  const authored = decision.input;
  if (authored.displayPositive) {
    const display = { ...turn, decision: { ...decision, input: { ...authored, displayPositive: false, min: -authored.max, max: -authored.min, start: -(Number(authored.start) || 0), responses: [] } } };
    return renderNumberDecision(container, display, state, (value, method) => onCommit(-value, method), draft === null ? null : -draft, value => onDraft(-value));
  }
  const input = authored;
  const min = Number(input.min);
  const max = Number(input.max);
  const step = Math.max(1, Number(input.step) || 1);
  const rawStart = input.start === 'current' ? readField(state, input.field) : input.start;
  // Inputs are authored on a step grid. If a saved state is between steps, keep it
  // until the learner touches the control; the next press still moves exactly one step.
  let value = clampNumber(draft ?? (Number.isFinite(Number(rawStart)) ? Number(rawStart) : min), min, max);
  const format = (number) => decisionValue(number, input.valueAs, input.unit);

  const card = el('div', 'card number-decision fade-in');
  card.dataset.control = 'number';
  card.dataset.value = String(value);
  card.appendChild(el('p', 'predict-question', localised(decision.prompt) || t('num.prompt')));
  if (input.hint) {
    // `{cost}` means "what one of the things you are pricing costs to make". For a
    // product line that is the line's own unit cost, not the flat field, which in a
    // multi-product chapter is still sitting at the engine's default.
    const unitCostField = String(input.field).startsWith('lines.')
      ? `${String(input.field).split('.').slice(0, 2).join('.')}.unitCost`
      : 'unitCost';
    card.appendChild(el('p', 'number-hint', localisedTemplate(input.hint, {
      cost: money(readField(state, unitCostField)),
      current: format(rawStart),
    })));
  }

  const presets = el('div', 'number-presets');
  const suggestions = /(^|\.)price$/.test(input.field)
    ? [min, clampNumber(min + Math.round((max - min) / (2 * step)) * step, min, max), max]
    : [-1, 0, 1, 2, -2].map(n => clampNumber(value + n * step, min, max));
  const values = [...new Set(suggestions)].slice(0, 3).sort((a, b) => a - b);
  for (const preset of values) {
    const button = el('button', 'number-preset'); button.type = 'button';
    button.dataset.amount = String(preset);
    button.appendChild(el('strong', null, input.valueAs === 'count' ? count(preset) : money(preset)));
    if (input.unit) button.appendChild(el('span', null, localised(input.unit)));
    button.addEventListener('click', () => onCommit(preset, 'preset'));
    presets.appendChild(button);
  }
  card.appendChild(presets);
  const custom = el('details', 'custom-number'); custom.open = draft !== null;
  custom.appendChild(el('summary', null, t('play.custom')));
  const stepper = el('div', 'stepper');
  const controls = el('div', 'stepper-controls'); stepper.appendChild(controls);
  const valueNode = el('output', 'stepper-value', format(value));
  valueNode.dataset.role = 'value'; valueNode.setAttribute('aria-live', 'polite');
  stepper.appendChild(valueNode); custom.appendChild(stepper);
  card.appendChild(custom);
  const calculation = el('details', 'decision-calculation');
  calculation.appendChild(el('summary', null, t('play.calculation')));
  card.appendChild(calculation);
  appendNumberFeedback(calculation, state, input, value);
  renderStepper(card, valueNode, value, min, max, step, format, nextValue => {
    value = nextValue;
    calculation.querySelector('.number-feedback')?.remove();
    appendNumberFeedback(calculation, state, input, value); onDraft(value);
  });
  if (/(^|\.)(staff|capacity|demand)$/.test(input.field)) card.querySelector('.number-entry').step = '1';
  const commit = el('button', 'btn btn-primary', t('num.commit'));
  commit.type = 'button';
  commit.dataset.role = 'commit';
  commit.setAttribute('aria-label', t('num.commitLabel'));
  commit.addEventListener('click', () => { if (card.querySelector('.number-entry').checkValidity()) onCommit(value, 'typed'); });
  custom.appendChild(commit);
  container.appendChild(card);
}

/**
 * A fixed amount split across named buckets. The first bucket starts with the full
 * amount: this is the simplest reversible default for a split decision and keeps the
 * commit valid before the learner moves anything.
 */
export function renderAllocateDecision(container, turn, state, onCommit, draft = null, onDraft = () => {}) {
  clear(container);
  const allocate = turn.decision.allocate;
  const total = allocationTotal(state, allocate);
  const buckets = allocate.buckets || [];
  const reserve = buckets.find(b => b.keepsCash) || buckets.at(-1);
  const limit = bucket => bucket.perStep?.debt < 0 ? state.debt * allocate.step / -bucket.perStep.debt : total;
  const split = Object.fromEntries(buckets.map(b => [b.id, b.id === reserve.id ? total : 0]));
  for (const bucket of buckets.filter(b => b.id !== reserve.id)) {
    split[bucket.id] = Math.min(split[reserve.id], limit(bucket), Math.max(0, Number(draft?.[bucket.id]) || 0));
    split[reserve.id] -= split[bucket.id];
  }
  if (draft && JSON.stringify(draft) !== JSON.stringify(split)) onDraft({ ...split });
  const card = el('div', 'card allocation-decision'); card.dataset.control = 'allocate';
  card.appendChild(el('h2', 'card-title', localised(turn.decision.prompt)));
  card.appendChild(el('p', null, t('alloc.amount', { amount: money(total) })));
  const reserveText = el('p', 'allocation-remaining'); reserveText.dataset.role = 'remaining';
  const buttons = [];
  const delta = (bucket, direction) => direction < 0 ? -Math.min(split[bucket.id], allocate.step) : Math.max(0, Math.min(split[reserve.id], allocate.step, limit(bucket) - split[bucket.id]));
  const refresh = () => {
    reserveText.textContent = t('alloc.remaining', { amount: money(split[reserve.id]) });
    for (const { button, bucket, direction } of buttons) button.disabled = delta(bucket, direction) === 0;
  };
  card.appendChild(reserveText);
  for (const bucket of buckets.filter(b => b.id !== reserve.id)) {
    const row = el('div', 'allocation-bucket'); row.dataset.bucket = bucket.id;
    row.appendChild(el('p', null, localised(bucket.label)));
    const value = el('output', 'stepper-value', money(split[bucket.id])); value.dataset.role = 'value';
    const controls = el('div', 'stepper-controls');
    for (const direction of [-1, 1]) {
      const button = stepButton(direction, direction < 0 ? 'alloc.decrease' : 'alloc.increase', direction < 0 ? 'alloc.decreaseLabel' : 'alloc.increaseLabel');
      button.addEventListener('click', () => {
        const amount = delta(bucket, direction);
        split[bucket.id] += amount; split[reserve.id] -= amount;
        value.textContent = money(split[bucket.id]); refresh(); onDraft({ ...split });
      }); buttons.push({ button, bucket, direction }); controls.appendChild(button);
    }
    row.appendChild(value); row.appendChild(controls); card.appendChild(row);
  }
  const commit = el('button', 'btn btn-primary', t('alloc.commit')); commit.dataset.role = 'commit';
  commit.addEventListener('click', () => onCommit({ ...split }));
  card.appendChild(commit); refresh(); container.appendChild(card);
}

/**
 * The evidence a diagnose step is read against.
 *
 * Three kinds, because content has legitimately asked for three. Chapter 1 asks which
 * P&L line caused a loss. Chapters 2 and 4 ask which line explains why the profit never
 * reached the bank — which is not in the P&L at all. Chapter 3 asks which step of the
 * process is capping output, which has no money figure and must not be given a fake one.
 *
 * Before this, all three went through one lookup of P&L rows: a key that was not a row
 * rendered as the raw key with "TZS 0" beside it, and in two of the three chapters that
 * included the correct answer. The learner was asked to read a line that said nothing.
 */
function diagnoseEvidence(state) {
  const evidence = new Map();
  for (const row of ledgerRows(weeklyPnl(state))) evidence.set(row.key, row.value);

  // The cash statement. Signs follow the ledger's rule — what leaves the business is
  // negative — so a row's sign still matches the direction it moves the money.
  const flow = weeklyCashFlow(state);
  evidence.set('cash.profit', flow.profit);
  evidence.set('cash.depreciation', flow.depreciation);
  evidence.set('cash.repayment', -flow.repayment);
  // The amount standing between profit and cash, not the week's movement in it: the
  // movement is settled every week (advanceWeek), so at the moment this is asked it is
  // zero, and zero is not what the learner is being asked to see.
  evidence.set('cash.workingCapitalChange', -flow.workingCapitalChange);

  return evidence;
}

/** Choose the line — of the ledger, of the cash statement, or of the process. */
export function renderDiagnose(container, turn, state, onAnswer) {
  clear(container);
  const diagnose = turn.diagnose.liveConstraint ? {
    ...turn.diagnose, answer: diagnosisAnswer(turn, state),
    options: [
      { id: 'capacity', key: 'capacity', label: { en: t('constraint.capacity', { n: count(state.capacity) }), sw: t('constraint.capacity', { n: count(state.capacity) }) }, detail: { en: t('constraint.capacityHelp'), sw: t('constraint.capacityHelp') } },
      { id: 'demand', key: 'demand', label: { en: t('constraint.demand', { n: count(state.demand) }), sw: t('constraint.demand', { n: count(state.demand) }) }, detail: { en: t('constraint.demandHelp'), sw: t('constraint.demandHelp') } },
    ],
  } : turn.diagnose;
  const evidence = diagnoseEvidence(state);
  const card = el('div', 'card diagnose fade-in');
  card.dataset.control = 'diagnose';
  card.appendChild(el('div', 'card-title', t('diag.title')));
  card.appendChild(el('p', 'predict-question', localised(diagnose.prompt) || t('diag.prompt')));

  const list = el('div', 'diagnose-options');
  for (const option of diagnose.options || []) {
    // A string is a line the engine can price. An object is evidence the engine has no
    // line for — a production step, a cost driver — and carries its own words.
    const authored = option !== null && typeof option === 'object';
    const id = authored ? option.id : option;
    const label = authored ? (localised(option.label) || id) : t(id);
    const value = evidence.has(id) ? evidence.get(id) : null;

    const button = el('button', 'diagnose-option');
    button.type = 'button';
    button.dataset.line = id;
    button.setAttribute('aria-label', t('diag.choose', { line: label }));
    button.appendChild(el('span', 'diagnose-label', label));

    if (value !== null) {
      button.appendChild(el('span', `diagnose-value${value < 0 ? ' negative' : ''}`, money(value)));
    } else if (authored && option.detail) {
      // No money figure exists for this one, so it says what it is instead of showing
      // a zero that would read as "this line is fine".
      button.appendChild(el('span', 'diagnose-detail', localised(option.detail)));
    }

    button.addEventListener('click', () => {
      [...list.children].forEach((item) => { item.disabled = true; });
      button.classList.add('selected');
      onAnswer(id, id === diagnose.answer);
    });
    list.appendChild(button);
  }
  card.appendChild(list);
  container.appendChild(card);
}

/** A numeric weekly-profit prediction, centred on the current P&L. */
export function renderGoal(container, progress, goal) {
  clear(container);
  if (!goal || !progress) return;
  const card = el('section', 'goal-panel');
  card.dataset.control = 'goal';
  card.appendChild(el('div', 'goal-title', localised(goal.label || goal.title) || t('goal.title')));
  if (goal.description) card.appendChild(el('p', 'goal-description', localised(goal.description)));

  const definitions = new Map((goal.conditions || []).map((condition) => [condition.id, condition]));
  const list = el('div', 'goal-conditions');
  for (const condition of progress.conditions || []) {
    const definition = definitions.get(condition.id) || {};
    const row = el('div', 'goal-condition');
    row.dataset.condition = condition.id;
    row.dataset.met = String(Boolean(condition.met));

    const status = el('div', 'goal-status');
    status.appendChild(el('span', 'goal-status-mark', condition.met ? '✓' : '○'));
    status.appendChild(el('span', 'goal-status-word', t(condition.met ? 'goal.met' : 'goal.notYet')));
    row.appendChild(status);
    row.appendChild(el('div', 'goal-condition-label', localised(definition.label) || t('goal.condition')));
    row.appendChild(el('div', 'goal-condition-value', t('goal.conditionValue', {
      current: fieldValue(condition.current, definition.field),
      target: fieldValue(condition.target, definition.field),
    })));
    list.appendChild(row);
  }
  card.appendChild(list);
  container.appendChild(card);
}

export function renderOptions(container, turn, onChoose, selected = null) {
  clear(container);
  const card = el('div', 'card fade-in');
  card.appendChild(el('div', 'card-title', localised(turn.decision.prompt) || t('decision.prompt')));
  const list = el('div', 'options');

  for (const opt of turn.decision.options) {
    const btn = el('button', `option${selected === opt.id ? ' selected' : ''}`);
    btn.dataset.option = opt.id; btn.setAttribute('aria-pressed', String(selected === opt.id));
    btn.type = 'button';
    const mark = el('span', 'option-mark', String(turn.decision.options.indexOf(opt) + 1));
    mark.setAttribute('aria-hidden', 'true'); btn.appendChild(mark);
    btn.appendChild(el('span', 'option-label', localised(opt.label)));
    if (opt.effects?.cash < 0) btn.appendChild(el('span', 'option-cost', money(opt.effects.cash)));
    btn.setAttribute('aria-expanded', String(selected === opt.id));

    btn.addEventListener('click', () => {
      [...list.children].forEach((c) => { c.classList.remove('selected'); });
      btn.classList.add('selected');
      onChoose(opt);
    });
    list.appendChild(btn);
  }

  card.appendChild(list);
  const details = el('details', 'option-explanations');
  details.appendChild(el('summary', null, t('play.options')));
  for (const opt of turn.decision.options) {
    if (!opt.detail) continue;
    details.appendChild(el('p', null, localised(opt.label)));
    details.appendChild(el('p', 'pnl-note', localised(opt.detail)));
  }
  if (turn.decision.options.some(o => o.detail)) card.appendChild(details);
  container.appendChild(card);
}

/**
 * Show the arithmetic before asking for a prediction.
 *
 * docs/localization.md: "Never require mental arithmetic to understand a consequence.
 * If the learner must compute to see what happened, show the computation." Predicting
 * a change to a number you were never shown is guesswork, and guesswork is not the
 * signal the assessment is meant to capture.
 */
/**
 * `choiceLabel` is a ready-made string, not an option object. A free numeric or
 * allocation decision has no option to take a label from, and resolving that here
 * would mean this function knowing about all three decision types.
 */
/**
 * The rows of the work-it-out card, built so that they add up to the profit underneath
 * them. That is the whole contract of this card, and it was broken two ways.
 *
 * A business with more than one product has no single price and no single unit cost —
 * `state.price` and `state.unitCost` are left at the engine's defaults, so chapters 2
 * to 4 were showing a bakery selling bread at chapter 1's mandazi price of 500 and
 * keeping 200 on each one. The units and the revenue were right, so the card asked the
 * learner to multiply two numbers and get a third that they do not make.
 *
 * And every chapter, including the first, dropped spoilage, freight, duty and currency
 * from the sum while still printing the profit as the total, so the column did not add
 * up whenever any of those was non-zero.
 *
 * Both are the same defect as D-021 in a different place: arithmetic put in front of a
 * learner has to be arithmetic that works.
 */
function workoutLines(state, pnl) {
  const rows = [];

  if (pnl.perLine.length > 1) {
    // Per product, as contribution: units sold times what each one keeps. It sums with
    // the rest of the column, and "which product actually earns" is the thing chapter 2
    // exists to teach.
    for (const line of pnl.perLine) {
      if (line.unitsSold === 0 && line.contribution === 0) continue;
      const per = line.unitsSold > 0 ? line.contribution / line.unitsSold : 0;
      rows.push({
        label: t('workout.line', {
          name: lineLabel(state, line.id),
          units: count(line.unitsSold),
          kept: money(per),
        }),
        value: line.contribution,
      });
    }
  } else {
    const only = pnl.perLine[0] || {};
    rows.push({
      label: t('workout.sell', {
        units: count(pnl.unitsSold),
        price: money(only.unitsSold > 0 ? only.revenue / only.unitsSold : state.price),
      }),
      value: pnl.revenue,
    });
    rows.push({
      label: t('workout.cost', {
        cost: money(only.unitsSold > 0 ? only.variableCost / only.unitsSold : state.unitCost),
      }),
      value: -pnl.variableCost,
    });
  }

  // Everything else the engine charges before profit. Each appears only when it is not
  // zero, which under chapter 1's opening state is all of them.
  if (pnl.fxEffect) rows.push({ label: t(pnl.fxEffect >= 0 ? 'pnl.fxGain' : 'pnl.fxLoss'), value: pnl.fxEffect });
  if (pnl.freight) rows.push({ label: t('pnl.freight'), value: -pnl.freight });
  if (pnl.duty) rows.push({ label: t('pnl.duty'), value: -pnl.duty });
  if (pnl.spoilage) rows.push({ label: t('pnl.spoilage'), value: -pnl.spoilage });

  rows.push({ label: t('workout.fixed'), value: -pnl.fixedCost });
  return rows;
}

export function renderWorkout(container, turn, choiceLabel, state, onReady) {
  clear(container);
  const pnl = weeklyPnl(state);

  const card = el('div', 'card workout slide-up');
  card.appendChild(el('div', 'card-title', t('workout.title')));
  if (choiceLabel) card.appendChild(el('p', 'situation', t('predict.chose', { label: choiceLabel })));
  card.appendChild(el('p', 'workout-intro', t('workout.intro')));

  const lines = workoutLines(state, pnl);

  const list = el('div', 'workout-lines');
  lines.forEach((line, i) => {
    const row = el('div', 'workout-row');
    row.appendChild(el('div', 'workout-label', line.label));
    const value = el('div', `workout-value${line.value < 0 ? ' negative' : ''}`, money(line.value));
    row.appendChild(value);
    list.appendChild(row);
    // Reveal one line at a time so the sum is followed, not just read.
    row.style.animationDelay = `${i * 140}ms`;
    row.classList.add('slide-up');
  });

  const total = el('div', 'workout-row total');
  total.appendChild(el('div', 'workout-label', t('workout.leaves')));
  const totalValue = el('div', `workout-value${pnl.profit < 0 ? ' negative' : ''}`, money(pnl.profit));
  total.appendChild(totalValue);
  total.style.animationDelay = `${lines.length * 140}ms`;
  total.classList.add('slide-up');
  list.appendChild(total);

  card.appendChild(list);
  card.appendChild(el('p', 'workout-ready', t('workout.ready')));

  const next = el('button', 'btn btn-primary', t('btn.continue'));
  next.type = 'button';
  next.addEventListener('click', onReady);
  card.appendChild(next);

  container.appendChild(card);
  animateNumber(totalValue, 0, pnl.profit, { duration: 700, format: money });
}

/** The money range each band actually means — see engine.bandFor and Q-014. */
export function predictionSummaryText(prediction) {
  if (!prediction) return '';
  if (prediction.kind === 'number') {
    return t('num.numberSummary', {
      predicted: money(prediction.predicted),
      actual: money(prediction.actual),
    });
  }
  return t('num.bandSummary', {
    predicted: t(`predict.${prediction.predictedId}`),
    actual: t(`predict.${prediction.actualId}`),
  });
}


/**
 * A consequence that was set in motion earlier and has just landed.
 *
 * The attribution is the teaching. An effect the learner cannot trace back to a choice
 * of theirs reads as bad luck, and bad luck teaches nothing.
 */
export function renderConsequences(container, fired, weeksPassed) {
  clear(container);

  // Some turns cover a month rather than a week. Saying so is what stops the slow
  // variables looking like they moved for no reason.
  if (weeksPassed > 1) {
    container.appendChild(el('div', 'weeks-passed slide-up',
      tCount('weeksPass', weeksPassed, { n: count(weeksPassed) })));
  }

  if (!fired || fired.length === 0) return;

  for (const item of fired) {
    const card = el('div', 'card consequence slide-up');
    card.appendChild(el('div', 'card-title', t('later.title')));
    card.appendChild(el('p', 'consequence-text',
      t('later.attribution', { week: count(item.causeWeek), cause: localised(item.cause) })));
    container.appendChild(card);
  }
}

export function renderScene(container, sceneName, state, chapterId) {
  const business = { 'mama-asha': 'stall-small', bakery: 'bakery', factory: 'factory', export: 'export' };
  drawScene(container, business[chapterId] || sceneName || 'stall-small', state);
}

export function animateTrade(container, cashChange) {
  const bubble = el('div', `cash-motion${cashChange < 0 ? ' cash-out' : ''}`, `${cashChange > 0 ? '+' : ''}${money(cashChange)}`);
  bubble.setAttribute('aria-hidden', 'true'); container.appendChild(bubble);
  if (cashChange) {
    const coins = el('div', `cash-stream${cashChange < 0 ? ' outgoing' : ''}`); coins.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) { const coin = el('span'); coin.style.animationDelay = `${i * 120}ms`; coins.appendChild(coin); }
    container.appendChild(coins);
  }
  container.classList.remove('is-trading');
  void container.offsetWidth;
  container.classList.add('is-trading');
}

export function renderProgress(container, done, total) {
  clear(container);
  const bar = el('div', 'progress-bar');
  container.appendChild(bar);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(done));
  bar.setAttribute('aria-valuemax', String(total));
  bar.setAttribute('aria-label', t('progress.label', { n: count(done), total: count(total) }));
  growBar(bar, done / Math.max(1, total));
}

// --- end-of-run profile --------------------------------------------------

// The concepts this chapter actually put in front of the learner, with the decision
// they made against each one.
//
// Every turn already carries a `conceptLabel` and it is shown for about a minute as a
// tag above the situation, then never again. Twenty of those go past in half an hour,
// which is how a learner finishes a chapter able to say what happened and not what it
// was teaching. This is the only place the whole list is visible at once.
//
// It is a recap, not a result. There is no tick, no cross and no ordering by how well
// anything went — the decision label is there so the concept has something concrete
// attached to it, which is the same reason the situations are scenes rather than
// exercises (contract section B). Nothing here may read as a mark (ADR-0004).
function renderConceptRecap(container, turns, decisions) {
  const made = new Map();
  for (const d of decisions) if (d.kind === 'decision') made.set(d.turnId, d);

  const rows = [];
  for (const turn of turns) {
    const label = localised(turn.conceptLabel);
    if (!label) continue;
    rows.push({ label, choice: localised(made.get(turn.id)?.optionLabel) });
  }
  if (rows.length === 0) return;

  const card = el('div', 'card recap fade-in');
  card.appendChild(el('div', 'card-title', t('profile.recapTitle')));
  card.appendChild(el('p', 'recap-intro', t('profile.recapIntro')));

  const list = el('ul', 'recap-list');
  for (const row of rows) {
    const item = el('li', 'recap-item');
    item.appendChild(el('span', 'recap-concept', row.label));
    if (row.choice) item.appendChild(el('span', 'recap-choice', row.choice));
    list.appendChild(item);
  }
  card.appendChild(list);
  container.appendChild(card);
}

/**
 * The learner-facing text of one profile statement, however it is keyed. Shared with
 * the printable record (main.js printRecord) so the two can never disagree — the
 * printed page is the same statements, not a second rendering of them.
 */
export function statementText(s) {
  return s.countKey ? tCount(s.countKey, s.count, { n: count(s.count) })
    : s.key ? t(s.key, s.params)
      : s.text;
}

export function renderProfile(container, profile, tally, state, history, turns = [], decisions = [], completed = true) {
  clear(container);

  // Completion is the gate (ADR-0005, resolved by the owner in session 005). Finishing
  // is what carries the learner forward; the prediction tally informs the NEXT stage and
  // is never a pass mark here. Saying so plainly is the difference between a record and
  // a score.
  const done = el('div', 'card finished fade-in');
  done.appendChild(el('div', 'card-title', t(completed ? 'profile.finished.title' : 'record.partial')));
  done.appendChild(el('p', 'finished-body', t(completed ? 'profile.finished.body' : 'record.partialBody')));
  container.appendChild(done);

  const card = el('div', 'card profile fade-in');
  card.appendChild(el('div', 'card-title', t('profile.title')));

  const head = el('div', 'profile-head');
  if (tally.total) {
    head.appendChild(el('div', 'profile-tally', proportion(tally.correct, tally.total)));
    head.appendChild(el('div', 'profile-tally-label', t('profile.tallyLabel')));
    head.appendChild(el('p', null, t('record.support', { guided: tally.guided || 0, independent: tally.independent || 0 })));
  }
  card.appendChild(head);

  for (const s of profile.statements) {
    const item = el('div', 'indicator');
    item.appendChild(el('div', 'indicator-label', s.indicatorKey ? t(s.indicatorKey) : s.indicator));

    const text = statementText(s);
    item.appendChild(el('div', 'indicator-text', text));

    if (s.detailKey || s.detail) {
      item.appendChild(el('div', 'indicator-evidence', s.detailKey ? t(s.detailKey) : s.detail));
    }
    card.appendChild(item);
  }

  const chartWrap = el('div', 'profile-chart');
  card.appendChild(chartWrap);
  container.appendChild(card);
  if (history && history.length > 1) drawChart(chartWrap, history);

  renderConceptRecap(container, turns, decisions);

  const limits = el('div', 'card limitations');
  limits.appendChild(el('div', 'card-title', t('profile.limitationsTitle')));
  const ul = el('ul', 'limitations-list');
  const lines = profile.limitationKeys
    ? profile.limitationKeys.map((k) => t(k))
    : profile.limitations;
  for (const line of lines) ul.appendChild(el('li', null, line));
  limits.appendChild(ul);
  container.appendChild(limits);
}

/** Constraint answers derive from the same visible capacity and demand facts. */
export function diagnosisAnswer(turn, state) {
  if (turn.diagnose?.liveConstraint) return state.capacity < state.demand ? 'capacity' : 'demand';
  return turn.diagnose?.answer;
}
export function renderCashBook(container, book, draft, onCommit, onDraft) {
  clear(container);
  const card = el('div', 'card cashbook'); card.dataset.control = 'cashbook';
  card.appendChild(el('h2', null, t('book.title')));
  const receipt = el('div', 'book-receipt');
  for (const key of ['opening', 'receipts', 'payments']) {
    receipt.appendChild(el('p', `book-row book-${key}`, t(`book.${key}`, { amount: money(book[key]) })));
  }
  card.appendChild(receipt);
  const label = el('label', null, t('book.balance')); label.htmlFor = 'book-balance'; card.appendChild(label);
  const input = el('input', 'number-entry'); input.id = 'book-balance'; input.type = 'number'; input.inputMode = 'decimal';
  input.required = true; input.step = 'any'; input.value = draft ?? '';
  const commit = el('button', 'btn btn-primary', t('play.checkBook')); commit.dataset.role = 'commit';
  const valid = () => input.checkValidity() && input.value !== '' && Number.isFinite(Number(input.value));
  commit.disabled = !valid();
  input.addEventListener('input', () => { commit.disabled = !valid(); onDraft(valid() ? Number(input.value) : null); });
  commit.addEventListener('click', () => { if (valid()) onCommit(Number(input.value), 'typed'); });
  card.appendChild(input); card.appendChild(commit); container.appendChild(card);
}
export function renderTurnResult(container, turn, result, narrative, label, onNext) {
  clear(container);
  const card = el('section', 'card reveal');
  card.appendChild(el('p', 'eyebrow', tCount('play.weekResult', turn.advanceWeeks || 1, { n: turn.advanceWeeks || 1 })));
  card.appendChild(el('h2', null, t('result.title')));
  const totals = el('div', 'result-totals'); totals.setAttribute('role', 'status');
  for (const [key, amount] of [['play.cashChange', result.cash.closing - result.cash.opening], ['play.profit', result.profit]]) {
    const tile = el('div', 'result-tile');
    tile.appendChild(el('span', null, t(key)));
    tile.appendChild(el('strong', amount < 0 ? 'negative' : 'positive', `${amount > 0 ? '+' : ''}${money(amount)}`));
    totals.appendChild(tile);
  }
  card.appendChild(totals);
  card.appendChild(el('p', 'takeaway', localised(turn.takeaway) || localised(narrative.lesson)));
  if (result.book) {
    const receipt = el('div', 'book-receipt');
    receipt.appendChild(el('p', null, t('play.bookAnswer', { entered: money(result.book.entered), closing: money(result.book.closing) })));
    receipt.appendChild(el('p', 'book-sum', `${money(result.book.opening)} + ${money(result.book.receipts)} − ${money(result.book.payments)} = ${money(result.book.closing)}`));
    card.appendChild(receipt);
  }
  if (result.diagnosis) {
    const d = result.diagnosis;
    card.appendChild(el('p', null, t(d.picked === d.answer ? 'diag.correct' : 'diag.correction')));
    card.appendChild(el('p', null, d.live ? t(`constraint.${d.answer}Help`) : localised(turn.diagnose.explanation)));
  }
  const next = el('button', 'btn btn-primary', t('btn.continue'));
  next.dataset.role = 'next'; next.addEventListener('click', onNext); card.appendChild(next);
  if (result.prediction) card.appendChild(el('p', 'forecast-result', predictionSummaryText(result.prediction)));
  const story = el('details', 'result-story');
  story.appendChild(el('summary', null, t('play.why')));
  story.appendChild(el('p', null, t('predict.chose', { label })));
  if (narrative.outcome) story.appendChild(el('p', null, localised(narrative.outcome)));
  if (narrative.lesson) story.appendChild(el('p', null, localised(narrative.lesson)));
  card.appendChild(story);
  const detail = el('details', 'cash-reconciliation');
  detail.appendChild(el('summary', null, t('result.calculation')));
  for (const [key, raw] of Object.entries(result.cash)) {
    const value = ['repayment', 'workingCapitalChange'].includes(key) ? -raw : raw;
    detail.appendChild(el('p', null, t(`result.${key}`, { amount: money(value) })));
  }
  card.appendChild(detail);
  const consequences = el('div'); renderConsequences(consequences, result.fired, turn.advanceWeeks || 1); card.appendChild(consequences);
  if (result.state.pending.length) card.appendChild(el('p', 'pnl-note', t('result.pending', { n: result.state.pending.length })));
  container.appendChild(card);
}

export function renderFacts(container, state) {
  clear(container);
  const facts = el('div', 'business-facts');
  const pnl = weeklyPnl(state);
  const time = ownerLoad(state);
  const values = [['cash', state.cash], ['stock', pnl.variableCost * state.inventoryWeeks], ['owed', pnl.revenue * state.debtorWeeks], ['time', time.used]];
  const moneyScale = Math.max(1, ...values.slice(0, 3).map(([, value]) => value));
  for (const [key, value] of values) {
    const box = el('div', 'business-fact');
    box.appendChild(el('span', null, t(`facts.${key}`)));
    box.appendChild(el('strong', null, key === 'time' ? t('facts.hours', { n: count(value), total: count(time.total) }) : money(value)));
    const bar = el('meter', 'fact-amount');
    bar.min = 0; bar.max = key === 'time' ? time.total : moneyScale; bar.value = Math.max(0, value);
    bar.setAttribute('aria-hidden', 'true'); // The exact labelled amount is directly above.
    box.appendChild(bar);
    facts.appendChild(box);
  }
  container.appendChild(facts);
}

export function renderChapterTransition(container, chapters, chapterId, carry, state, onNext, onExit, onRecord) {
  clear(container);
  const index = chapters.findIndex(chapter => chapter.id === chapterId);
  const current = chapters[index], next = chapters[index + 1];
  const card = el('section', 'card chapter-transition');
  const stamp = el('div', 'episode-stamp', '✓'); stamp.setAttribute('aria-hidden', 'true'); card.appendChild(stamp);
  card.appendChild(el('p', 'eyebrow', t('play.completedChoices')));
  card.appendChild(el('h2', null, t(next ? 'play.nextBusiness' : 'play.arcDone')));
  const art = el('div', `bridge-art${next ? '' : ' final'}`);
  for (const chapter of [current, next].filter(Boolean)) {
    if (chapter === next) { const arrow = el('span', 'bridge-arrow', '→'); arrow.setAttribute('aria-hidden', 'true'); art.appendChild(arrow); }
    const figure = el('figure'); const scene = el('div');
    renderScene(scene, null, chapter === current ? state : { demand: 180, capacity: 200, staff: 2 }, chapter.id);
    figure.appendChild(scene); figure.appendChild(el('figcaption', null, localised(chapter.title))); art.appendChild(figure);
  }
  card.appendChild(art);
  card.appendChild(el('p', 'bridge-story', next ? localised(current.bridge) : t('play.arcBody')));
  const path = el('ol', 'journey-path');
  for (const chapter of chapters) {
    const done = carry.completed.includes(chapter.id);
    path.appendChild(el('li', done ? 'done' : '', `${done ? '✓ ' : ''}${localised(chapter.title)}`));
  }
  card.appendChild(path);
  if (next) {
    const go = el('button', 'btn btn-primary', t('play.explore', { business: localised(next.title) }));
    go.addEventListener('click', () => onNext(next.id)); card.appendChild(go);
    card.appendChild(el('p', 'bridge-note', t('play.nextBudget')));
  }
  const rest = el('button', 'btn btn-ghost', t('episode.stop')); rest.addEventListener('click', onExit); card.appendChild(rest);
  const record = el('button', 'btn btn-ghost', t('record.open')); record.addEventListener('click', onRecord); card.appendChild(record);
  container.appendChild(card);
}
