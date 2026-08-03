// Rendering. One decision per screen (docs/game-design.md, "Interface constraints").
//
// All text goes in via textContent, never innerHTML — scenario content is data and
// must never become markup.

import { money, moneyShort, count, proportion } from './format.js';
import { weeklyPnl, ownerLoad } from './engine.js';
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

// --- top bar -------------------------------------------------------------

export function renderStats(container, state, prevState) {
  clear(container);
  const pnl = weeklyPnl(state);
  const load = ownerLoad(state);

  const tiles = [
    { label: 'Week', value: count(state.week), raw: state.week, fmt: count },
    { label: 'Cash', value: moneyShort(state.cash), raw: state.cash, fmt: moneyShort },
    { label: 'Profit', value: moneyShort(pnl.profit), raw: pnl.profit, fmt: moneyShort, negative: pnl.profit < 0 },
    { label: 'Sold', value: count(pnl.unitsSold), raw: pnl.unitsSold, fmt: count },
  ];

  for (const t of tiles) {
    const tile = el('div', 'stat');
    tile.appendChild(el('div', 'stat-label', t.label));
    const value = el('div', `stat-value${t.negative ? ' negative' : ''}`, t.value);
    tile.appendChild(value);
    container.appendChild(tile);

    // Animate only when a number actually moved, so movement means something.
    if (prevState) {
      const before = t.label === 'Profit' ? weeklyPnl(prevState).profit
        : t.label === 'Cash' ? prevState.cash
          : t.label === 'Week' ? prevState.week
            : weeklyPnl(prevState).unitsSold;
      if (before !== t.raw) {
        animateNumber(value, before, t.raw, { duration: 600, format: t.fmt });
      }
    }
  }

  if (load.overloaded) {
    const warn = el('div', 'stat stat-warn');
    warn.appendChild(el('div', 'stat-label', 'Your time'));
    warn.appendChild(el('div', 'stat-value negative', 'Too much'));
    container.appendChild(warn);
  }
}

// --- profit and loss -----------------------------------------------------

export function renderPnl(container, state, opts = {}) {
  clear(container);
  const pnl = weeklyPnl(state);

  const rows = [
    ['Sales', pnl.revenue],
    ['Cost of what you sold', -pnl.variableCost],
    ['Rent', -pnl.rent],
  ];
  if (pnl.wages > 0) rows.push(['Wages', -pnl.wages]);
  if (pnl.licenceFees > 0) rows.push(['Fees', -pnl.licenceFees]);
  if (pnl.spoilage > 0) rows.push(['Food thrown away', -pnl.spoilage]);

  for (const [label, value] of rows) {
    const row = el('div', 'pnl-row');
    row.appendChild(el('div', 'pnl-label', label));
    row.appendChild(el('div', `pnl-value${value < 0 ? ' negative' : ''}`, money(value)));
    container.appendChild(row);
  }

  const total = el('div', 'pnl-row total');
  total.appendChild(el('div', 'pnl-label', 'Profit this week'));
  total.appendChild(el('div', `pnl-value${pnl.profit < 0 ? ' negative' : ''}`, money(pnl.profit)));
  container.appendChild(total);

  if (pnl.unmetDemand > 0) {
    container.appendChild(el('div', 'pnl-note', `${count(pnl.unmetDemand)} customers wanted to buy and you had nothing left.`));
  }
  if (opts.showMargin && pnl.revenue > 0) {
    const perUnit = state.price - state.unitCost;
    container.appendChild(el('div', 'pnl-note', `You keep ${money(perUnit)} from each one you sell, before rent and wages.`));
  }
}

// --- turn phases ---------------------------------------------------------

export function renderSituation(container, turn) {
  clear(container);
  const card = el('div', 'card fade-in');
  const head = el('div', 'card-title');
  head.appendChild(el('span', 'concept-tag', turn.conceptLabel || turn.concept || ''));
  card.appendChild(head);
  card.appendChild(el('p', 'situation', turn.situation));
  container.appendChild(card);
  return card;
}

export function renderInfo(container, turn, state, onSeek, sought) {
  clear(container);
  if (!turn.info || turn.info.length === 0) return;

  const card = el('div', 'card fade-in');
  card.appendChild(el('div', 'card-title', 'Before you decide'));
  const list = el('div', 'info-list');

  for (const item of turn.info) {
    const used = sought.has(item.id);
    const btn = el('button', `info-item${used ? ' used' : ''}`);
    btn.type = 'button';
    btn.appendChild(el('span', 'info-label', item.label));

    const cost = [];
    if (item.costHours) cost.push(`${item.costHours}h`);
    if (item.costCash) cost.push(money(item.costCash));
    if (cost.length && !used) btn.appendChild(el('span', 'info-cost', cost.join(' · ')));

    if (used) {
      btn.appendChild(el('span', 'info-reveals', item.reveals));
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => onSeek(item));
    }
    list.appendChild(btn);
  }

  card.appendChild(list);
  container.appendChild(card);
}

export function renderOptions(container, turn, onChoose) {
  clear(container);
  const card = el('div', 'card fade-in');
  card.appendChild(el('div', 'card-title', turn.decision.prompt || 'What do you do?'));
  const list = el('div', 'options');

  for (const opt of turn.decision.options) {
    const btn = el('button', 'option');
    btn.type = 'button';
    btn.appendChild(el('span', 'option-label', opt.label));
    if (opt.detail) btn.appendChild(el('span', 'option-detail', opt.detail));
    btn.addEventListener('click', () => {
      [...list.children].forEach((c) => c.classList.remove('selected'));
      btn.classList.add('selected');
      onChoose(opt);
    });
    list.appendChild(btn);
  }

  card.appendChild(list);
  container.appendChild(card);
}

/**
 * Predict-then-reveal. The learner commits to an expectation BEFORE seeing the
 * result. This is simultaneously the engagement mechanic and the measurement —
 * see memory/sessions/2026-08-02-002 and docs/assessment.md.
 */
export function renderPredict(container, turn, chosenOption, onPredict) {
  clear(container);
  const card = el('div', 'card predict slide-up');
  card.appendChild(el('div', 'card-title', 'Your call'));
  card.appendChild(el('p', 'situation', `You chose: ${chosenOption.label}`));
  card.appendChild(el('p', 'predict-question',
    turn.decision.predictQuestion || 'What happens to your weekly profit?'));

  const list = el('div', 'predict-choices');
  const choices = turn.decision.predictChoices || [
    { id: 'up_lot', label: 'Goes up a lot' },
    { id: 'up_bit', label: 'Goes up a little' },
    { id: 'same', label: 'Stays about the same' },
    { id: 'down', label: 'Goes down' },
  ];

  for (const choice of choices) {
    const btn = el('button', 'predict-choice');
    btn.type = 'button';
    btn.textContent = choice.label;
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

export function renderReveal(container, turn, option, predicted, correct, pnlBefore, pnlAfter, onNext) {
  clear(container);
  const card = el('div', `reveal ${correct ? 'correct' : 'wrong'} slide-up`);

  const verdict = el('div', 'reveal-verdict');
  // Never colour alone — docs/localization.md.
  verdict.appendChild(el('span', 'reveal-mark', correct ? '✓' : '✗'));
  verdict.appendChild(el('span', 'reveal-text',
    correct ? 'You called it right.' : 'Not what you expected.'));
  card.appendChild(verdict);

  const delta = pnlAfter - pnlBefore;
  const deltaRow = el('div', 'reveal-delta');
  deltaRow.appendChild(el('span', 'reveal-delta-label', 'Weekly profit'));
  const deltaVal = el('span', `reveal-delta-value${delta < 0 ? ' negative' : ''}`,
    `${delta >= 0 ? '+' : ''}${money(delta)}`);
  deltaRow.appendChild(deltaVal);
  card.appendChild(deltaRow);

  card.appendChild(el('p', 'outcome', option.outcome));
  if (option.lesson) card.appendChild(el('p', 'lesson', option.lesson));

  const next = el('button', 'btn btn-primary', 'Continue');
  next.type = 'button';
  next.addEventListener('click', onNext);
  card.appendChild(next);

  container.appendChild(card);
  animateNumber(deltaVal, 0, delta, {
    duration: 700,
    format: (v) => `${v >= 0 ? '+' : ''}${money(v)}`,
  });
}

export function renderScene(container, sceneName, state) {
  drawScene(container, sceneName || 'stall-small', state);
}

export function renderChart(container, history) {
  if (!history || history.length < 2) { clear(container); return; }
  drawChart(container, history);
}

export function renderProgress(container, done, total) {
  clear(container);
  const bar = el('div', 'progress-bar');
  bar.style.width = `${Math.round((done / Math.max(1, total)) * 100)}%`;
  container.appendChild(bar);
  container.setAttribute('role', 'progressbar');
  container.setAttribute('aria-valuenow', String(done));
  container.setAttribute('aria-valuemax', String(total));
  container.setAttribute('aria-label', `Question ${done} of ${total}`);
}

// --- end-of-run profile --------------------------------------------------

export function renderProfile(container, profile, tally, state, history) {
  clear(container);

  const card = el('div', 'card profile fade-in');
  card.appendChild(el('div', 'card-title', 'What you did'));

  const head = el('div', 'profile-head');
  head.appendChild(el('div', 'profile-tally', proportion(tally.correct, tally.total)));
  head.appendChild(el('div', 'profile-tally-label', 'predictions correct'));
  if (tally.trend === 'improved') {
    head.appendChild(el('div', 'profile-trend', 'You got better as you went on.'));
  }
  card.appendChild(head);

  for (const s of profile.statements) {
    const item = el('div', 'indicator');
    item.appendChild(el('div', 'indicator-label', s.indicator));
    item.appendChild(el('div', 'indicator-text', s.text));
    if (s.detail) item.appendChild(el('div', 'indicator-evidence', s.detail));
    card.appendChild(item);
  }

  const chartWrap = el('div', 'profile-chart');
  card.appendChild(chartWrap);
  container.appendChild(card);
  if (history && history.length > 1) drawChart(chartWrap, history);

  const limits = el('div', 'card limitations');
  limits.appendChild(el('div', 'card-title', 'What this does not tell you'));
  const ul = el('ul', 'limitations-list');
  for (const line of profile.limitations) {
    ul.appendChild(el('li', null, line));
  }
  limits.appendChild(ul);
  container.appendChild(limits);
}
