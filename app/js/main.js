// Application bootstrap and turn state machine.
//
// Flow per turn:
//   situation -> (optional information) -> decision -> work it out -> prediction -> reveal
//
// The prediction step sits between the decision and its consequence deliberately.
// The learner commits to an expectation before learning whether they were right,
// which is what makes the answer worth recording. "Work it out" sits in front of the
// prediction so that expectation is formed from numbers they have actually seen.

import { createState, applyEffects, weeklyPnl, advanceWeeks, scheduleLater } from './engine.js';
import * as record from './record.js';
import * as store from './storage.js';
import * as ui from './ui.js';
import { setCurrency } from './format.js';
import { loadStrings, setLanguage, getLanguage, LANGUAGES, t, localised } from './i18n.js';

const SCENARIO_URL = './content/scenario-mama-asha.json';
const UI_STRINGS_URL = './content/ui.json';
const LANGUAGE_KEY = 'business-simulator-language';

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
  dom.consequence = q('consequence');
  dom.pnl = q('pnl');
  dom.trajectory = q('trajectory');
  dom.banner = q('banner');
  dom.langBanner = q('lang-banner');
  dom.title = q('title');
  dom.reset = q('reset');
  dom.lang = q('lang');
  dom.pnlToggle = q('pnl-toggle');
  dom.pnlWrap = q('pnl-wrap');
  dom.footPrivacy = q('foot-privacy');
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
    fired: [],
    weeksPassed: 0,
    record: record.createRecord(scenario.id),
  };
}

function persist() {
  store.save(session);
}

function currentTurn() {
  return scenario.turns[session.turnIndex];
}

function chosenOption() {
  const turn = currentTurn();
  return turn.decision.options.find((o) => o.id === session.chosenOptionId);
}

/** The state the learner's choice would produce, before any time passes. */
function afterChoiceState() {
  return applyEffects(session.state, chosenOption().effects || {});
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

  // Restore the panels, which renderEnd hides.
  dom.pnlToggle.hidden = false;
  if (dom.pnlToggle.getAttribute('aria-expanded') === 'true') dom.pnlWrap.removeAttribute('hidden');

  ui.renderStats(dom.stats, session.state, prevState);
  ui.renderScene(dom.scene, turn.scene, session.state);
  ui.renderProgress(dom.progress, session.turnIndex, scenario.turns.length);
  ui.renderSituation(dom.situation, turn);
  ui.renderPnl(dom.pnl, session.state);
  ui.renderTrajectory(dom.trajectory, session.state);
  ui.renderConsequences(dom.consequence, session.fired, session.weeksPassed);

  const sought = new Set(session.sought);
  ui.renderInfo(dom.info, turn, session.state, onSeekInfo, sought);

  if (session.phase === 'situation') {
    ui.renderOptions(dom.decision, turn, onChooseOption);
  } else if (session.phase === 'workout') {
    ui.renderWorkout(dom.decision, turn, chosenOption(), session.state, onWorkoutDone);
    scrollToDecision();
  } else if (session.phase === 'predict') {
    ui.renderPredict(dom.decision, turn, chosenOption(), onPredict);
    scrollToDecision();
  } else if (session.phase === 'reveal') {
    const opt = chosenOption();
    ui.renderReveal(
      dom.decision, turn, opt, session.predictedId,
      session.predictedId === opt.predictAnswer,
      session.state, afterChoiceState(), onNext,
    );
    scrollToDecision();
  }
}

// --- handlers ------------------------------------------------------------

function onSeekInfo(item) {
  if (session.sought.includes(item.id)) return;
  session.sought.push(item.id);

  const next = { ...session.state };
  if (item.costHours) next.ownerHoursUsed += item.costHours;
  if (item.costCash) next.cash -= item.costCash;
  session.state = next;

  record.observeInfoSought(session.record, currentTurn().id, item.id, item.id);
  persist();
  renderAll();
}

function onChooseOption(option) {
  session.chosenOptionId = option.id;
  session.phase = 'workout';
  persist();
  renderAll();
}

function onWorkoutDone() {
  session.phase = 'predict';
  persist();
  renderAll();
}

function onPredict(choice) {
  const turn = currentTurn();
  const opt = chosenOption();

  session.predictedId = choice.id;
  const correct = choice.id === opt.predictAnswer;
  record.observePrediction(session.record, turn.id, choice.id, opt.predictAnswer, correct, 'profit');

  session.phase = 'reveal';
  persist();
  renderAll();
}

function onNext() {
  const turn = currentTurn();
  const opt = chosenOption();
  const prevState = session.state;

  const before = weeklyPnl(session.state).profit;
  const after = weeklyPnl(afterChoiceState()).profit;

  record.observeDecision(
    session.record, turn.id, turn.concept, opt.id, localised(opt.label),
    session.sought.length, before, after,
  );

  // Apply the choice, queue anything it sets in motion for later, then let time pass so
  // consequences arrive on a lag.
  let next = applyEffects(session.state, opt.effects || {});
  next = scheduleLater(next, opt.later || [], localised(opt.label));

  const advanced = advanceWeeks(next, turn.advanceWeeks || 1);

  session.history.push(...advanced.weekly);
  session.state = advanced.state;
  session.fired = advanced.fired;
  session.weeksPassed = turn.advanceWeeks || 1;
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
  ui.clear(dom.trajectory);
  ui.clear(dom.consequence);
  // The weekly money panel is meaningless once the run is over — hide it and its toggle
  // rather than leaving an empty bordered card on the results screen.
  dom.pnlWrap.setAttribute('hidden', '');
  dom.pnlToggle.hidden = true;

  const profile = record.buildProfile(session.record);
  const tally = record.predictionTally(session.record);
  ui.renderProfile(dom.decision, profile, tally, session.state, session.history);

  const actions = ui.el('div', 'end-actions');

  const again = ui.el('button', 'btn btn-primary', t('btn.playAgain'));
  again.type = 'button';
  again.addEventListener('click', () => { store.clear(); start(true); });
  actions.appendChild(again);

  const download = ui.el('button', 'btn btn-ghost', t('btn.saveRecord'));
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

// --- chrome --------------------------------------------------------------

/** Strings that live outside the turn loop and so are not redrawn by renderAll. */
function renderChrome() {
  document.title = localised(scenario && scenario.title) || t('app.title');
  dom.title.textContent = localised(scenario && scenario.title) || t('app.title');
  dom.reset.textContent = t('btn.startAgain');
  dom.footPrivacy.textContent = t('foot.privacy');

  const open = !dom.pnlWrap.hasAttribute('hidden');
  dom.pnlToggle.textContent = t(open ? 'btn.hideNumbers' : 'btn.showNumbers');

  // Placeholder figures must be visibly labelled as placeholders until reviewed by
  // someone with local ground truth. AGENTS.md section 6.
  if (scenario && scenario.unverified) {
    dom.banner.textContent = t('banner.unverified');
    dom.banner.hidden = false;
  }

  // The same honesty applies to the translation: it is a first draft and has not been
  // checked by a first-language speaker (docs/localization.md warns specifically that
  // register cannot be got right this way).
  const draft = getLanguage() !== 'en';
  dom.langBanner.textContent = draft ? t('banner.draftLanguage') : '';
  dom.langBanner.hidden = !draft;

  for (const btn of dom.lang.querySelectorAll('button')) {
    const active = btn.dataset.lang === getLanguage();
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
  }
}

function buildLanguageToggle() {
  ui.clear(dom.lang);
  dom.lang.setAttribute('aria-label', t('lang.label'));

  for (const lang of LANGUAGES) {
    const btn = ui.el('button', 'lang-btn', lang.label);
    btn.type = 'button';
    btn.dataset.lang = lang.code;
    btn.addEventListener('click', () => {
      if (getLanguage() === lang.code) return;
      setLanguage(lang.code);
      try { localStorage.setItem(LANGUAGE_KEY, lang.code); } catch { /* private mode */ }
      renderChrome();
      renderAll();
    });
    dom.lang.appendChild(btn);
  }
}

// --- startup -------------------------------------------------------------

async function start(forceNew) {
  const saved = forceNew ? null : store.load();
  if (saved && saved.scenarioId === scenario.id && Array.isArray(saved.history)) {
    session = saved;
    session.sought = session.sought || [];
    session.fired = session.fired || [];
    session.state.pending = session.state.pending || [];
  } else {
    session = newSession();
  }
  renderAll();
}

async function init() {
  cacheDom();

  let strings;
  let loaded;
  try {
    const [stringsRes, scenarioRes] = await Promise.all([
      fetch(UI_STRINGS_URL),
      fetch(SCENARIO_URL),
    ]);
    if (!stringsRes.ok) throw new Error(`HTTP ${stringsRes.status}`);
    if (!scenarioRes.ok) throw new Error(`HTTP ${scenarioRes.status}`);
    strings = await stringsRes.json();
    loaded = await scenarioRes.json();
  } catch (err) {
    // No string table yet, so this one message cannot come from i18n.
    dom.situation.appendChild(ui.el('div', 'card',
      'Could not load the app content. If you opened this file directly, run it through a local web server instead — see app/README.md.'));
    console.error(err);
    return;
  }

  loadStrings(strings);
  scenario = loaded;

  let preferred = null;
  try { preferred = localStorage.getItem(LANGUAGE_KEY); } catch { /* private mode */ }
  setLanguage(preferred || 'en');
  setCurrency(scenario.currency || 'TZS');

  buildLanguageToggle();

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
    dom.pnlToggle.textContent = t(open ? 'btn.hideNumbers' : 'btn.showNumbers');
  });

  renderChrome();
  await start(false);
}

document.addEventListener('DOMContentLoaded', init);
