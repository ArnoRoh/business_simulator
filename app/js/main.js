// Application bootstrap and turn state machine.
//
// Flow per turn:
//   situation -> (optional information) -> decision -> prediction -> reveal
//
// The prediction step sits between the decision and its consequence deliberately.
// The learner commits to an expectation before learning whether they were right,
// which is what makes the answer worth recording.

import { createState, applyEffects, weeklyPnl, advanceWeek } from './engine.js';
import * as record from './record.js';
import * as store from './storage.js';
import * as ui from './ui.js';
import { setLocale } from './format.js';

const SCENARIO_URL = './content/scenario-mama-asha.json';

const dom = {};
let scenario = null;
let session = null;

function q(id) { return document.getElementById(id); }

function cacheDom() {
  dom.stats = q('stats');
  dom.scene = q('scene');
  dom.progress = q('progress');
  dom.situation = q('situation');
  dom.info = q('info');
  dom.decision = q('decision');
  dom.pnl = q('pnl');
  dom.banner = q('banner');
  dom.title = q('title');
  dom.reset = q('reset');
  dom.pnlToggle = q('pnl-toggle');
  dom.pnlWrap = q('pnl-wrap');
}

function newSession() {
  return {
    scenarioId: scenario.id,
    turnIndex: 0,
    phase: 'situation',
    state: createState(scenario.startState || {}),
    history: [],
    sought: [],
    chosenOptionId: null,
    predictedId: null,
    record: record.createRecord(scenario.id),
  };
}

function persist() {
  session.soughtArr = undefined;
  store.save(session);
}

function currentTurn() {
  return scenario.turns[session.turnIndex];
}

function scrollToDecision() {
  // Keep the active step in view without yanking the page around.
  requestAnimationFrame(() => {
    dom.decision.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// --- rendering -----------------------------------------------------------

function renderAll(prevState) {
  const turn = currentTurn();

  if (!turn) { renderEnd(); return; }

  // Restore the P&L panel, which renderEnd hides.
  dom.pnlToggle.hidden = false;
  if (dom.pnlToggle.getAttribute('aria-expanded') === 'true') dom.pnlWrap.removeAttribute('hidden');

  ui.renderStats(dom.stats, session.state, prevState);
  ui.renderScene(dom.scene, turn.scene, session.state);
  ui.renderProgress(dom.progress, session.turnIndex, scenario.turns.length);
  ui.renderSituation(dom.situation, turn);
  ui.renderPnl(dom.pnl, session.state, { showMargin: session.turnIndex < 4 });

  const sought = new Set(session.sought);
  ui.renderInfo(dom.info, turn, session.state, onSeekInfo, sought);

  if (session.phase === 'situation') {
    ui.renderOptions(dom.decision, turn, onChooseOption);
  } else if (session.phase === 'predict') {
    const opt = turn.decision.options.find((o) => o.id === session.chosenOptionId);
    ui.renderPredict(dom.decision, turn, opt, onPredict);
    scrollToDecision();
  } else if (session.phase === 'reveal') {
    renderRevealPhase();
    scrollToDecision();
  }
}

function renderRevealPhase() {
  const turn = currentTurn();
  const opt = turn.decision.options.find((o) => o.id === session.chosenOptionId);
  const correct = session.predictedId === opt.predictAnswer;

  ui.renderReveal(
    dom.decision, turn, opt, session.predictedId, correct,
    session.pnlBefore, session.pnlAfter, onNext,
  );
}

// --- handlers ------------------------------------------------------------

function onSeekInfo(item) {
  if (session.sought.includes(item.id)) return;
  session.sought.push(item.id);

  const next = { ...session.state };
  if (item.costHours) next.ownerHoursUsed += item.costHours;
  if (item.costCash) next.cash -= item.costCash;
  session.state = next;

  record.observeInfoSought(session.record, currentTurn().id, item.id, item.label);
  persist();
  renderAll();
}

function onChooseOption(option) {
  session.chosenOptionId = option.id;
  session.phase = 'predict';
  persist();
  renderAll();
}

function onPredict(choice) {
  const turn = currentTurn();
  const opt = turn.decision.options.find((o) => o.id === session.chosenOptionId);

  const before = weeklyPnl(session.state).profit;
  const after = weeklyPnl(applyEffects(session.state, opt.effects || {})).profit;

  session.predictedId = choice.id;
  session.pnlBefore = before;
  session.pnlAfter = after;

  const correct = choice.id === opt.predictAnswer;
  record.observePrediction(session.record, turn.id, choice.id, opt.predictAnswer, correct, 'profit');

  session.phase = 'reveal';
  persist();
  renderAll();
}

function onNext() {
  const turn = currentTurn();
  const opt = turn.decision.options.find((o) => o.id === session.chosenOptionId);
  const prevState = session.state;

  record.observeDecision(
    session.record, turn.id, turn.concept, opt.id, opt.label,
    session.sought.length, session.pnlBefore, session.pnlAfter,
  );

  // Apply the choice, then let a week pass so consequences arrive with a lag.
  let next = applyEffects(session.state, opt.effects || {});
  const advanced = advanceWeek(next);
  next = advanced.state;

  session.history.push({
    week: prevState.week,
    profit: advanced.pnl.profit,
    cash: next.cash,
  });

  session.state = next;
  session.turnIndex += 1;
  session.phase = 'situation';
  session.sought = [];
  session.chosenOptionId = null;
  session.predictedId = null;

  persist();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderAll(prevState);
}

function renderEnd() {
  ui.renderStats(dom.stats, session.state);
  ui.renderScene(dom.scene, 'stall-busy', session.state);
  ui.renderProgress(dom.progress, scenario.turns.length, scenario.turns.length);
  ui.clear(dom.situation);
  ui.clear(dom.info);
  ui.clear(dom.pnl);
  // The weekly P&L box is meaningless once the run is over — hide it and its toggle
  // rather than leaving an empty bordered card on the results screen.
  dom.pnlWrap.setAttribute('hidden', '');
  dom.pnlToggle.hidden = true;

  const profile = record.buildProfile(session.record);
  const tally = record.predictionTally(session.record);
  ui.renderProfile(dom.decision, profile, tally, session.state, session.history);

  const actions = ui.el('div', 'end-actions');

  const again = ui.el('button', 'btn btn-primary', 'Play again');
  again.type = 'button';
  again.addEventListener('click', () => { store.clear(); start(true); });
  actions.appendChild(again);

  const download = ui.el('button', 'btn btn-ghost', 'Save my record');
  download.type = 'button';
  download.addEventListener('click', () => downloadRecord(profile));
  actions.appendChild(download);

  dom.decision.appendChild(actions);
}

/** The learner holds their own record — SECURITY.md. Nothing is transmitted. */
function downloadRecord(profile) {
  const blob = new Blob([store.exportJson({ profile, observations: session.record.observations })],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-simulator-record-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- startup -------------------------------------------------------------

async function start(forceNew) {
  const saved = forceNew ? null : store.load();
  if (saved && saved.scenarioId === scenario.id && Array.isArray(saved.history)) {
    session = saved;
    session.sought = session.sought || [];
  } else {
    session = newSession();
  }
  renderAll();
}

async function init() {
  cacheDom();

  let res;
  try {
    res = await fetch(SCENARIO_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    scenario = await res.json();
  } catch (err) {
    dom.situation.appendChild(ui.el('div', 'card',
      'Could not load the scenario. If you opened this file directly, run it through a local web server instead — see app/README.md.'));
    console.error(err);
    return;
  }

  setLocale('en', scenario.currency || 'TZS');
  dom.title.textContent = scenario.title || 'Business Simulator';

  // Placeholder figures must be visibly labelled as placeholders until reviewed by
  // someone with local ground truth. AGENTS.md section 6.
  if (scenario.unverified) {
    dom.banner.textContent = 'Practice figures — the money amounts here are made up for teaching, not real local prices.';
    dom.banner.hidden = false;
  }

  dom.reset.addEventListener('click', () => {
    store.clear();
    start(true);
    window.scrollTo({ top: 0 });
  });

  dom.pnlToggle.addEventListener('click', () => {
    const open = dom.pnlWrap.hasAttribute('hidden');
    if (open) dom.pnlWrap.removeAttribute('hidden');
    else dom.pnlWrap.setAttribute('hidden', '');
    dom.pnlToggle.setAttribute('aria-expanded', String(open));
    dom.pnlToggle.textContent = open ? 'Hide the numbers' : 'Show the numbers';
  });

  await start(false);
}

document.addEventListener('DOMContentLoaded', init);
