// Rendering. One decision per screen (docs/game-design.md, "Interface constraints").
//
// All text goes in via textContent, never innerHTML — scenario content is data and
// must never become markup. All text comes from i18n, never a literal in this file
// (docs/localization.md rule 1).

import { money, moneyShort, moneySigned, count, proportion } from './format.js';
import { weeklyPnl, ownerLoad, project, bandFor, BAND_SAME, BAND_LOT } from './engine.js';
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

// --- top bar -------------------------------------------------------------

export function renderStats(container, state, prevState) {
  clear(container);
  const pnl = weeklyPnl(state);
  const load = ownerLoad(state);

  const row = el('div', 'stat-row');
  const tiles = [
    { key: 'stat.week', value: count(state.week), raw: state.week, fmt: count },
    { key: 'stat.cash', value: moneyShort(state.cash), raw: state.cash, fmt: moneyShort, negative: state.cash < 0 },
    { key: 'stat.profit', value: moneyShort(pnl.profit), raw: pnl.profit, fmt: moneyShort, negative: pnl.profit < 0 },
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
  ].filter((r) => !(r.hideIfZero && r.value === 0));
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

/**
 * The always-on money panel: what came in, what went out, what is left.
 *
 * Grouped and barred rather than listed, because magnitude has to be visible and not
 * just readable — docs/localization.md, "Numbers".
 */
export function renderPnl(container, state) {
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

  container.appendChild(card);

  // Per-unit economics. This used to appear only for the first four turns; it is the
  // single most reusable idea in the whole scenario, so it stays on screen.
  if (pnl.unitsSold > 0) {
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

export function renderSituation(container, turn) {
  clear(container);
  const card = el('div', 'card fade-in');
  const head = el('div', 'card-title');
  head.appendChild(el('span', 'concept-tag', localised(turn.conceptLabel) || turn.concept || ''));
  card.appendChild(head);
  card.appendChild(el('p', 'situation', localised(turn.situation)));
  container.appendChild(card);
  return card;
}

export function renderInfo(container, turn, state, onSeek, sought) {
  clear(container);
  if (!turn.info || turn.info.length === 0) return;

  const card = el('div', 'card fade-in');
  card.appendChild(el('div', 'card-title', t('info.title')));
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
function touchedDimensions(effects = {}) {
  const found = new Set();
  for (const key of Object.keys(effects)) {
    if (key === 'cash' || key === 'price' || key === 'unitCost'
      || key === 'rent' || key === 'licenceFees' || key === 'formality') found.add('cash');
    else if (key.startsWith('ownerHours') || key === 'staff') found.add('time');
    else if (key === 'hygiene') found.add('quality');
    else if (key === 'reputation') found.add('reputation');
    else if (key === 'capacity') found.add('capacity');
    else if (key === 'demand') found.add('customers');
  }
  return [...found];
}

export function renderOptions(container, turn, onChoose) {
  clear(container);
  const card = el('div', 'card fade-in');
  card.appendChild(el('div', 'card-title', localised(turn.decision.prompt) || t('decision.prompt')));
  const list = el('div', 'options');

  for (const opt of turn.decision.options) {
    const btn = el('button', 'option');
    btn.type = 'button';
    btn.appendChild(el('span', 'option-label', localised(opt.label)));
    if (opt.detail) btn.appendChild(el('span', 'option-detail', localised(opt.detail)));

    const touches = touchedDimensions(opt.effects);
    if (touches.length) {
      const chips = el('span', 'option-touches');
      chips.appendChild(el('span', 'option-touches-label', t('decision.touches')));
      for (const dim of touches) chips.appendChild(el('span', `chip chip-${dim}`, t(`touch.${dim}`)));
      btn.appendChild(chips);
    }

    btn.addEventListener('click', () => {
      [...list.children].forEach((c) => { c.classList.remove('selected'); c.disabled = true; });
      btn.classList.add('selected');
      onChoose(opt);
    });
    list.appendChild(btn);
  }

  card.appendChild(list);
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
export function renderWorkout(container, turn, chosenOption, state, onReady) {
  clear(container);
  const pnl = weeklyPnl(state);

  const card = el('div', 'card workout slide-up');
  card.appendChild(el('div', 'card-title', t('workout.title')));
  card.appendChild(el('p', 'situation', t('predict.chose', { label: localised(chosenOption.label) })));
  card.appendChild(el('p', 'workout-intro', t('workout.intro')));

  const lines = [
    {
      label: t('workout.sell', { units: count(pnl.unitsSold), price: money(state.price) }),
      value: pnl.revenue,
    },
    {
      label: t('workout.cost', { cost: money(state.unitCost) }),
      value: -pnl.variableCost,
    },
    {
      label: t('workout.fixed'),
      value: -pnl.fixedCost,
    },
  ];

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
function bandHint(choiceId) {
  if (choiceId === 'up_lot') return t('predict.band.up_lot', { high: money(BAND_LOT) });
  if (choiceId === 'up_bit') return t('predict.band.up_bit', { low: money(BAND_SAME), high: money(BAND_LOT) });
  if (choiceId === 'same') return t('predict.band.same', { high: money(BAND_SAME) });
  if (choiceId === 'down') return t('predict.band.down', { low: money(BAND_SAME) });
  return '';
}

/**
 * Predict-then-reveal. The learner commits to an expectation BEFORE seeing the
 * result. This is simultaneously the engagement mechanic and the measurement —
 * see memory/sessions/2026-08-02-002 and docs/assessment.md.
 *
 * Each band is labelled with the amounts it covers. Without that the learner is graded
 * against a boundary they were never shown, and "up a little" means one thing to them
 * and another to the engine (Q-014).
 */
export function renderPredict(container, turn, chosenOption, onPredict) {
  clear(container);
  const card = el('div', 'card predict slide-up');
  card.appendChild(el('div', 'card-title', t('predict.title')));
  card.appendChild(el('p', 'predict-question',
    localised(turn.decision.predictQuestion) || t('predict.question')));

  const list = el('div', 'predict-choices');
  const choices = turn.decision.predictChoices
    || ['up_lot', 'up_bit', 'same', 'down'].map((id) => ({ id }));

  for (const choice of choices) {
    const btn = el('button', 'predict-choice');
    btn.type = 'button';
    btn.appendChild(el('span', 'predict-choice-label', localised(choice.label) || t(`predict.${choice.id}`)));
    const hint = bandHint(choice.id);
    if (hint) btn.appendChild(el('span', 'predict-choice-band', hint));

    btn.addEventListener('click', () => {
      [...list.children].forEach((c) => { c.classList.remove('selected'); c.disabled = true; });
      btn.classList.add('selected');
      onPredict(choice);
    });
    list.appendChild(btn);
  }

  card.appendChild(list);
  container.appendChild(card);
  pulse(card);
}

/**
 * Before and after, side by side.
 *
 * A single profit delta tells the learner they were wrong without telling them where
 * they were wrong. Showing every line lets them find the one that moved.
 */
function comparisonLedger(beforeState, afterState) {
  const before = weeklyPnl(beforeState);
  const after = weeklyPnl(afterState);
  const rowsBefore = ledgerRows(before);
  const rowsAfter = ledgerRows(after);

  const keys = [...new Set([...rowsBefore, ...rowsAfter].map((r) => r.key))];
  const wrap = el('div', 'compare');

  const head = el('div', 'compare-row head');
  head.appendChild(el('div', 'compare-label', ''));
  head.appendChild(el('div', 'compare-value', t('reveal.before')));
  head.appendChild(el('div', 'compare-value', t('reveal.after')));
  wrap.appendChild(head);

  for (const key of keys) {
    const b = rowsBefore.find((r) => r.key === key);
    const a = rowsAfter.find((r) => r.key === key);
    const bv = b ? b.value : 0;
    const av = a ? a.value : 0;
    const changed = bv !== av;

    const row = el('div', `compare-row${changed ? ' changed' : ''}`);
    row.appendChild(el('div', 'compare-label', t(key)));
    row.appendChild(el('div', `compare-value${bv < 0 ? ' negative' : ''}`, money(bv)));
    row.appendChild(el('div', `compare-value${av < 0 ? ' negative' : ''}`, money(av)));
    wrap.appendChild(row);
  }

  const totalRow = el('div', 'compare-row total');
  totalRow.appendChild(el('div', 'compare-label', t('pnl.profitThisWeek')));
  totalRow.appendChild(el('div', `compare-value${before.profit < 0 ? ' negative' : ''}`, money(before.profit)));
  const afterCell = el('div', `compare-value${after.profit < 0 ? ' negative' : ''}`, money(after.profit));
  totalRow.appendChild(afterCell);
  wrap.appendChild(totalRow);

  return { wrap, afterCell, before, after };
}

/** Which line moved most — the answer to "but why?" after a wrong prediction. */
function biggestMover(beforeState, afterState) {
  const before = ledgerRows(weeklyPnl(beforeState));
  const after = ledgerRows(weeklyPnl(afterState));
  const keys = [...new Set([...before, ...after].map((r) => r.key))];

  let best = null;
  for (const key of keys) {
    const b = before.find((r) => r.key === key);
    const a = after.find((r) => r.key === key);
    const change = (a ? a.value : 0) - (b ? b.value : 0);
    if (!best || Math.abs(change) > Math.abs(best.change)) best = { key, change };
  }
  return best;
}

export function renderReveal(container, turn, option, predictedId, correct, beforeState, afterState, onNext) {
  clear(container);
  const card = el('div', `reveal ${correct ? 'correct' : 'wrong'} slide-up`);

  const verdict = el('div', 'reveal-verdict');
  // Never colour alone — docs/localization.md.
  verdict.appendChild(el('span', 'reveal-mark', correct ? '✓' : '✗'));
  verdict.appendChild(el('span', 'reveal-text',
    t(correct ? 'reveal.right' : 'reveal.wrong')));
  card.appendChild(verdict);

  const { wrap, afterCell, before, after } = comparisonLedger(beforeState, afterState);
  card.appendChild(wrap);

  const delta = after.profit - before.profit;
  const deltaRow = el('div', 'reveal-delta');
  deltaRow.appendChild(el('span', 'reveal-delta-label', t('reveal.weeklyProfit')));
  const deltaVal = el('span', `reveal-delta-value${delta < 0 ? ' negative' : ''}`, moneySigned(delta));
  deltaRow.appendChild(deltaVal);
  card.appendChild(deltaRow);

  // What they said versus what the engine did, in the same words as the buttons.
  if (!correct) {
    card.appendChild(el('p', 'reveal-said', t('reveal.youSaid', {
      predicted: t(`predict.${predictedId}`),
      actual: t(`predict.${bandFor(delta)}`),
    })));

    const mover = biggestMover(beforeState, afterState);
    const look = el('div', 'second-look');
    look.appendChild(el('div', 'second-look-title', t('secondLook.title')));
    look.appendChild(el('p', null, mover && mover.change !== 0
      ? t('secondLook.moved', { label: t(mover.key), change: moneySigned(mover.change) })
      : t('secondLook.nothing')));
    card.appendChild(look);
  }

  card.appendChild(el('p', 'outcome', localised(option.outcome)));
  if (option.lesson) card.appendChild(el('p', 'lesson', localised(option.lesson)));

  const next = el('button', 'btn btn-primary', t('btn.continue'));
  next.type = 'button';
  next.addEventListener('click', onNext);
  card.appendChild(next);

  container.appendChild(card);
  animateNumber(deltaVal, 0, delta, { duration: 700, format: moneySigned });
  animateNumber(afterCell, before.profit, after.profit, { duration: 700, format: money });
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

export function renderScene(container, sceneName, state) {
  drawScene(container, sceneName || 'stall-small', state);
}

export function renderProgress(container, done, total) {
  clear(container);
  const bar = el('div', 'progress-bar');
  container.appendChild(bar);
  container.setAttribute('role', 'progressbar');
  container.setAttribute('aria-valuenow', String(done));
  container.setAttribute('aria-valuemax', String(total));
  container.setAttribute('aria-label', t('progress.label', { n: count(done), total: count(total) }));
  growBar(bar, done / Math.max(1, total));
}

// --- end-of-run profile --------------------------------------------------

export function renderProfile(container, profile, tally, state, history) {
  clear(container);

  // Completion is the gate (ADR-0005, resolved by the owner in session 005). Finishing
  // is what carries the learner forward; the prediction tally informs the NEXT stage and
  // is never a pass mark here. Saying so plainly is the difference between a record and
  // a score.
  const done = el('div', 'card finished fade-in');
  done.appendChild(el('div', 'card-title', t('profile.finished.title')));
  done.appendChild(el('p', 'finished-body', t('profile.finished.body')));
  container.appendChild(done);

  const card = el('div', 'card profile fade-in');
  card.appendChild(el('div', 'card-title', t('profile.title')));

  const head = el('div', 'profile-head');
  head.appendChild(el('div', 'profile-tally', proportion(tally.correct, tally.total)));
  head.appendChild(el('div', 'profile-tally-label', t('profile.tallyLabel')));
  if (tally.trend === 'improved') {
    head.appendChild(el('div', 'profile-trend', t('profile.improved')));
  }
  card.appendChild(head);

  for (const s of profile.statements) {
    const item = el('div', 'indicator');
    item.appendChild(el('div', 'indicator-label', s.indicatorKey ? t(s.indicatorKey) : s.indicator));

    const text = s.countKey ? tCount(s.countKey, s.count, { n: count(s.count) })
      : s.key ? t(s.key, s.params)
        : s.text;
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
