// Application bootstrap and turn state machine.
//
// Flow per turn:
//   situation -> (optional information) -> decision -> work it out -> prediction -> reveal
//
// The prediction step sits between the decision and its consequence deliberately.
// The learner commits to an expectation before learning whether they were right,
// which is what makes the answer worth recording. "Work it out" sits in front of the
// prediction so that expectation is formed from numbers they have actually seen.

import {
  createState, applyEffects, weeklyPnl, advanceWeeks, scheduleLater,
  resolveNumberInput, resolveAllocation, bandForValue, gradePrediction,
  evaluateGoal, needsRecovery,
} from './engine.js';
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
  dom.goal = q('goal');
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

    // v3: what the learner supplied, rather than which option they recognised.
    inputValue: null,
    split: null,
    diagnosed: null,
    predictedValue: null,

    fired: [],
    weeksPassed: 0,
    recoveriesUsed: 0,
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
  if (!turn.decision.options) return null;
  return turn.decision.options.find((o) => o.id === session.chosenOptionId);
}

function decisionType(turn) {
  return (turn && turn.decision && turn.decision.type) || 'choice';
}

/**
 * What the learner decided, as an effects object — whichever way they decided it.
 *
 * This is the seam v3 turns on. A `choice` turn hands back a pre-authored effects
 * block; `number` and `allocate` turns compute one from the value the learner actually
 * supplied, through the declarative response curves in content. Everything downstream
 * — the reveal, the P&L, the record — is identical either way, which is what lets the
 * three decision types share one turn loop.
 */
function chosenEffects() {
  const turn = currentTurn();
  const type = decisionType(turn);

  if (type === 'number') {
    return resolveNumberInput(session.state, turn.decision.input, session.inputValue);
  }
  if (type === 'allocate') {
    return resolveAllocation(session.state, turn.decision.allocate, session.split || {});
  }
  const opt = chosenOption();
  return (opt && opt.effects) || {};
}

/** The state the learner's decision would produce, before any time passes. */
function afterChoiceState() {
  return applyEffects(session.state, chosenEffects());
}

/**
 * The outcome and lesson text for what they decided.
 *
 * A `choice` carries its own. A free decision selects from `bands` on the value chosen
 * — on the value, not on the profit change, so the narrative can talk about the decision
 * the learner made rather than only its result.
 */
function narrativeFor() {
  const turn = currentTurn();
  const type = decisionType(turn);

  if (type === 'number') {
    const band = bandForValue(turn.decision.bands, session.inputValue);
    return { outcome: band && band.outcome, lesson: band && band.lesson };
  }
  if (type === 'allocate') {
    const buckets = turn.decision.allocate.buckets || [];
    const total = Object.values(session.split || {}).reduce((a, b) => a + b, 0);
    const first = (session.split || {})[buckets[0] && buckets[0].id] || 0;
    const band = bandForValue(turn.decision.bands, total > 0 ? first / total : 0);
    return { outcome: band && band.outcome, lesson: band && band.lesson };
  }
  const opt = chosenOption();
  return { outcome: opt && opt.outcome, lesson: opt && opt.lesson };
}

/** A short label for the record — what they chose, in words. */
function decisionLabel() {
  const turn = currentTurn();
  const type = decisionType(turn);
  if (type === 'number') return `${turn.decision.input.field}=${session.inputValue}`;
  if (type === 'allocate') {
    return Object.entries(session.split || {}).map(([k, v]) => `${k}=${v}`).join(' ');
  }
  const opt = chosenOption();
  return localised(opt && opt.label);
}

/** Band or numeric — the prediction, packaged for the reveal. */
function predictionResult() {
  const turn = currentTurn();
  const numeric = turn.decision.predict === 'number';

  if (numeric) {
    const actual = weeklyPnl(afterChoiceState()).profit;
    const graded = gradePrediction(session.predictedValue, actual);
    return { kind: 'number', ...graded };
  }
  const opt = chosenOption();
  const actualId = opt && opt.predictAnswer;
  return {
    kind: 'band',
    predictedId: session.predictedId,
    actualId,
    correct: session.predictedId === actualId,
  };
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

  // The goal is what makes twenty decisions one campaign rather than twenty quizzes.
  // It steers; it never scores — completion is the gate (ADR-0005, D-008).
  if (scenario.goal) {
    ui.renderGoal(dom.goal, evaluateGoal(session.state, scenario.goal), scenario.goal);
  }

  const sought = new Set(session.sought);
  ui.renderInfo(dom.info, turn, session.state, onSeekInfo, sought);

  const type = decisionType(turn);

  if (session.phase === 'situation') {
    // A diagnose step, where content asks for one, runs before the decision: read the
    // ledger and say which line is the problem, then act on it.
    if (turn.diagnose && session.diagnosed === null) {
      ui.renderDiagnose(dom.decision, turn, session.state, onDiagnose);
    } else if (type === 'number') {
      ui.renderNumberDecision(dom.decision, turn, session.state, onCommitNumber);
    } else if (type === 'allocate') {
      ui.renderAllocateDecision(dom.decision, turn, session.state, onCommitAllocation);
    } else {
      ui.renderOptions(dom.decision, turn, onChooseOption);
    }
  } else if (session.phase === 'workout') {
    ui.renderWorkout(dom.decision, turn, chosenOption(), session.state, onWorkoutDone);
    scrollToDecision();
  } else if (session.phase === 'predict') {
    if (turn.decision.predict === 'number') {
      ui.renderPredictNumber(dom.decision, turn, session.state, onPredictNumber);
    } else {
      ui.renderPredict(dom.decision, turn, chosenOption(), onPredict);
    }
    scrollToDecision();
  } else if (session.phase === 'reveal') {
    ui.renderReveal(dom.decision, {
      turn,
      narrative: narrativeFor(),
      prediction: predictionResult(),
      beforeState: session.state,
      afterState: afterChoiceState(),
      onNext,
    });
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

function onDiagnose(pickedKey) {
  const turn = currentTurn();
  const correct = pickedKey === turn.diagnose.answer;
  session.diagnosed = pickedKey;
  record.observeDiagnosis(session.record, turn.id, pickedKey, turn.diagnose.answer, correct);
  persist();
  renderAll();
}

function onChooseOption(option) {
  session.chosenOptionId = option.id;
  session.phase = 'workout';
  persist();
  renderAll();
}

/** A free numeric decision — the value itself is the evidence, so it is recorded. */
function onCommitNumber(value) {
  const turn = currentTurn();
  session.inputValue = value;
  record.observeInput(session.record, turn.id, turn.decision.input.field, value);
  session.phase = 'workout';
  persist();
  renderAll();
}

function onCommitAllocation(split) {
  const turn = currentTurn();
  session.split = split;
  for (const [bucket, amount] of Object.entries(split)) {
    record.observeInput(session.record, turn.id, `allocate.${bucket}`, amount);
  }
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

function onPredictNumber(value) {
  const turn = currentTurn();
  session.predictedValue = value;

  const actual = weeklyPnl(afterChoiceState()).profit;
  const graded = gradePrediction(value, actual);
  record.observePrediction(
    session.record, turn.id, value, actual, graded.correct, 'profit',
    { predicted: value, actual, error: graded.error, grade: graded.grade },
  );

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
  const label = decisionLabel();

  record.observeDecision(
    session.record, turn.id, turn.concept, (opt && opt.id) || decisionType(turn), label,
    session.sought.length, before, after,
  );

  // Apply the decision, queue anything it sets in motion for later, then let time pass
  // so consequences arrive on a lag.
  let next = applyEffects(session.state, chosenEffects());
  next = scheduleLater(next, (opt && opt.later) || [], label);

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
  session.inputValue = null;
  session.split = null;
  session.diagnosed = null;
  session.predictedValue = null;

  // Running out of money is a chapter boundary, not an ending (docs/game-design.md).
  // The learner gets a turn about trading their way out, which is the situation the
  // scenario most needs to teach and the one a fail screen would skip.
  if (scenario.recovery && needsRecovery(session.state) && session.recoveriesUsed < 2) {
    session.recoveriesUsed += 1;
    scenario.turns.splice(session.turnIndex, 0, JSON.parse(JSON.stringify(scenario.recovery)));
    scenario.turns[session.turnIndex].id = `recovery-${session.recoveriesUsed}`;
  }

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

  // Goal progress travels with the record as an OBSERVATION — what the business looked
  // like at the end, not a mark out of four. Missing a condition is not failing.
  if (scenario.goal) {
    session.record.goalProgress = evaluateGoal(session.state, scenario.goal);
    ui.renderGoal(dom.goal, session.record.goalProgress, scenario.goal);
  }

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
