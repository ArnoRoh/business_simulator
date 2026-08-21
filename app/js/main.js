// Application bootstrap and turn state machine.
//
// Flow per turn:
//   situation -> (optional information) -> decision -> [work it out] -> prediction -> reveal
//
// The prediction step sits between the decision and its consequence deliberately.
// The learner commits to an expectation before learning whether they were right,
// which is what makes the answer worth recording. "Work it out" sits in front of the
// prediction so that expectation is formed from numbers they have actually seen — and
// since D-017 it runs only where content asks for it, plus wherever the prediction is
// a number. See phaseAfterDecision().
//
// Above the turn loop sits the chapter loop (ADR-0007): four chapters, each a
// self-contained scenario with an authored opening, connected by six carried flags.

import {
  createState, applyEffects, weeklyPnl, advanceWeeks, scheduleLater,
  resolveNumberInput, resolveAllocation, bandForValue, gradePrediction,
  evaluateGoal, needsRecovery, predictionWindow, setBands,
} from './engine.js';
import * as record from './record.js';
import * as store from './storage.js';
import * as ui from './ui.js';
import { setCurrency, money, count } from './format.js';
import { loadStrings, setLanguage, getLanguage, LANGUAGES, t, localised } from './i18n.js';
import { applyCarryIn, collectCarry, situationFor } from './carry.js';

const CHAPTERS_URL = './content/chapters.json';
const UI_STRINGS_URL = './content/ui.json';
const LANGUAGE_KEY = 'business-simulator-language';

const dom = {};
let chapters = [];
let scenario = null;
let session = null;

// The six carried flags plus which chapters have been finished (ADR-0007). Loaded
// once at startup and written when a chapter ends.
let carry = { flags: {}, completed: [] };

/** Overrides and opening notes produced by the carried flags for the loaded chapter. */
let carryIn = { startState: {}, notes: [], carry: {} };

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
  dom.chapters = q('chapters');
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
    // The authored opening, with only the fields a matching carry rule names moved.
    // Never a state carried wholesale from the previous chapter — see ADR-0007.
    state: createState(carryIn.startState || {}),
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
    // Ledger lines beyond the basic five that have already introduced themselves.
    seenLines: [],
    recoveriesUsed: 0,
    // Where recovery turns were spliced into the chapter. Saved, because the scenario
    // file is re-fetched clean on every load and the turn list has to be rebuilt to
    // match the index the session is holding — see restoreRecoveries().
    recoveryAt: [],
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
 * Where a turn goes once the learner has decided.
 *
 * "Work it out" used to run on every turn. It was added because estimating a profit
 * figure was too hard (Q-017, session 007), and it is kept for exactly that case —
 * a numeric prediction always gets it, whatever content says. Everywhere else it is
 * opt-in, which is most of what "keep the interaction more basic" means in practice
 * (D-017): the common turn is now situation → decision → predict → reveal.
 */
function phaseAfterDecision(turn) {
  if (turn.decision.predict === 'number') return 'workout';
  return turn.workout ? 'workout' : 'predict';
}

/** The turn as the learner sees it, once their carried flags have tinted it. */
function tinted(turn) {
  const situation = situationFor(turn, carry.flags);
  return situation === turn.situation ? turn : { ...turn, situation };
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

/**
 * What they decided, written out for the learner and for the record.
 *
 * Values are formatted, not raw: "TZS 650" rather than "price=650". This string is the
 * one the record keeps, and the record is meant to be read by a human at a programme.
 */
function decisionLabel() {
  const turn = currentTurn();
  const type = decisionType(turn);

  if (type === 'number') {
    const input = turn.decision.input;
    const shown = input.valueAs === 'count' ? count(session.inputValue) : money(session.inputValue);
    // The authored noun, so the record and the work-it-out card say "-150 loaves a week"
    // rather than "-150". See decisionValue() in ui.js.
    const unit = localised(input.unit);
    return unit ? t('num.withUnit', { value: shown, unit }) : shown;
  }

  if (type === 'allocate') {
    const buckets = turn.decision.allocate.buckets || [];
    return buckets
      .map((b) => `${localised(b.label)} ${money((session.split || {})[b.id] || 0)}`)
      .join(' · ');
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
    // Graded against the same step the learner was given to answer with, so landing on
    // the nearest reachable value counts as close.
    const graded = gradePrediction(
      session.predictedValue,
      actual,
      predictionWindow(session.state, turn).step,
    );
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
  ui.renderSituation(dom.situation, tinted(turn), carryIn.notes);
  // The advanced ledger lines on screen this turn. Marked seen when the turn ends, so a
  // line that has just arrived explains itself for as long as the learner is looking at
  // the turn that brought it, and never again.
  session.shownLines = ui.renderPnl(dom.pnl, session.state, session.seenLines || [], prevState);
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
    ui.renderWorkout(dom.decision, turn, decisionLabel(), session.state, onWorkoutDone);
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
  session.phase = phaseAfterDecision(currentTurn());
  persist();
  renderAll();
}

/** A free numeric decision — the value itself is the evidence, so it is recorded. */
function onCommitNumber(value) {
  const turn = currentTurn();
  session.inputValue = value;
  record.observeInput(session.record, turn.id, turn.decision.input.field, value);
  session.phase = phaseAfterDecision(turn);
  persist();
  renderAll();
}

function onCommitAllocation(split) {
  const turn = currentTurn();
  session.split = split;
  for (const [bucket, amount] of Object.entries(split)) {
    record.observeInput(session.record, turn.id, `allocate.${bucket}`, amount);
  }
  session.phase = phaseAfterDecision(turn);
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
  const graded = gradePrediction(value, actual, predictionWindow(session.state, turn).step);
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

  // Only count a line as introduced if the panel it appeared in was actually open. The
  // money panel is collapsed until the learner asks for it, so marking these seen
  // regardless would spend the one explanation each line gets on a turn where nobody
  // could have read it.
  if (!dom.pnlWrap.hasAttribute('hidden')) {
    session.seenLines = [...new Set([...(session.seenLines || []), ...(session.shownLines || [])])];
  }
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
    insertRecovery(session.turnIndex, session.recoveriesUsed);
    session.recoveryAt.push(session.turnIndex);
  }

  persist();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderAll(prevState);
}

// --- chapters ------------------------------------------------------------

/**
 * The chapter select.
 *
 * Nothing is locked, ever. Order is a suggestion — completion carries a learner
 * forward and no chapter gates another (ADR-0005, D-008). A learner with two hours of
 * contact time in a programme may only ever play one of these, and it should be the
 * one that matches the business they actually have.
 */
function renderChapterSelect() {
  ui.clear(dom.stats);
  ui.clear(dom.info);
  ui.clear(dom.pnl);
  ui.clear(dom.trajectory);
  ui.clear(dom.consequence);
  ui.clear(dom.goal);
  ui.clear(dom.progress);
  ui.clear(dom.scene);
  dom.pnlWrap.setAttribute('hidden', '');
  dom.pnlToggle.hidden = true;
  renderChrome();

  ui.renderChapterSelect(dom.situation, dom.decision, chapters, carry, openChapter);
  window.scrollTo({ top: 0 });
}

/** Fetch and start one chapter. The only place a scenario file is loaded. */
async function openChapter(chapterId, forceNew) {
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) { renderChapterSelect(); return; }

  let loaded;
  try {
    const res = await fetch(`./content/${chapter.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    loaded = await res.json();
  } catch (err) {
    // A chapter that has not been authored yet must not take the app down with it.
    ui.clear(dom.decision);
    dom.situation.appendChild(ui.el('div', 'card', t('chapter.unavailable')));
    console.error(err);
    return;
  }

  scenario = loaded;
  carryIn = applyCarryIn(scenario, carry.flags);
  setCurrency(scenario.currency || 'TZS');
  setBands(scenario.bands);
  renderChrome();
  await start(forceNew);
}

/** Bank the six flags and note the chapter finished. Nothing is summed (ADR-0004). */
function bankCarry() {
  carry.flags = collectCarry(session.state, carry.flags);
  if (!carry.completed.includes(scenario.id)) carry.completed.push(scenario.id);
  store.saveCarry(carry);
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

  // The carried flags are banked here, at the one point a chapter is definitely
  // finished. They are facts about what was done, recorded alongside the observations
  // and never rolled into anything.
  bankCarry();
  session.record.carriedFlags = { ...carry.flags };

  const profile = record.buildProfile(session.record);
  const tally = record.predictionTally(session.record);
  ui.renderProfile(
    dom.decision, profile, tally, session.state, session.history,
    scenario.turns, session.record.observations,
  );

  const actions = ui.el('div', 'end-actions');

  // Whatever comes next in the manifest, offered but not imposed.
  const index = chapters.findIndex((c) => c.id === scenario.id);
  const next = index >= 0 ? chapters[index + 1] : null;
  if (next) {
    const onward = ui.el('button', 'btn btn-primary',
      `${t('btn.nextChapter')}: ${localised(next.title)}`);
    onward.type = 'button';
    onward.addEventListener('click', () => {
      store.clear();
      openChapter(next.id, true);
      window.scrollTo({ top: 0 });
    });
    actions.appendChild(onward);
  }

  const chooser = ui.el('button', 'btn btn-ghost', t('btn.chooseChapter'));
  chooser.type = 'button';
  chooser.addEventListener('click', () => { store.clear(); scenario = null; renderChapterSelect(); });
  actions.appendChild(chooser);

  const again = ui.el('button', next ? 'btn btn-ghost' : 'btn btn-primary', t('btn.playAgain'));
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
  // `carriedFlags` travels with the record because it is part of what was observed —
  // a learner arrived at this chapter having kept books, or not. It is a fact, listed
  // alongside the observations and never rolled into anything (ADR-0004).
  const blob = new Blob([store.exportJson({
    profile,
    scenarioId: session.record.scenarioId,
    carriedFlags: session.record.carriedFlags || {},
    observations: session.record.observations,
  })],
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
  if (!scenario) { dom.banner.hidden = true; }
  dom.reset.textContent = t('btn.startAgain');

  // Getting out of a chapter you opened by mistake used to mean finishing it: "Start
  // again" restarts the chapter in progress, and the chapter list was only reachable
  // from the end screen. On a shared phone in a programme that is a trap.
  dom.chapters.textContent = t('btn.chooseChapter');
  dom.chapters.hidden = !scenario;
  dom.footPrivacy.textContent = t('foot.privacy');

  const open = !dom.pnlWrap.hasAttribute('hidden');
  dom.pnlToggle.textContent = t(open ? 'btn.hideNumbers' : 'btn.showNumbers');

  // Placeholder figures must be visibly labelled as placeholders until reviewed by
  // someone with local ground truth. AGENTS.md section 6.
  //
  // Hidden explicitly when they are not, rather than only when there is no chapter
  // loaded: a warning that stays up over a chapter whose figures were checked is a
  // false warning, and the whole value of this banner is that it is believed.
  if (scenario && scenario.unverified) {
    dom.banner.textContent = t('banner.unverified');
    dom.banner.hidden = false;
  } else if (scenario) {
    dom.banner.hidden = true;
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
      // The chapter select is a screen too, and it is the first one a learner sees.
      // renderAll() reads scenario.turns, so switching language there threw and left
      // the chapter list sitting in the language the learner had just switched away
      // from — the most visible possible place for this to be wrong.
      if (scenario && session) renderAll(); else renderChapterSelect();
    });
    dom.lang.appendChild(btn);
  }
}

// --- startup -------------------------------------------------------------

/** Splice one recovery chapter into the loaded scenario at `index`. */
function insertRecovery(index, ordinal) {
  const turn = JSON.parse(JSON.stringify(scenario.recovery));
  turn.id = `recovery-${ordinal}`;
  scenario.turns.splice(index, 0, turn);
}

/**
 * Put back the recovery turns a saved session had already been given.
 *
 * `scenario.turns` is mutated when cash goes below zero, but the scenario file is
 * re-fetched clean every time the app starts — and on the target devices it is killed
 * and restarted often (storage.js). Without this the saved `turnIndex` points into a
 * shorter list than the one it was recorded against, so resuming skipped one authored
 * turn per recovery the learner had been through and ended the chapter early.
 */
function restoreRecoveries() {
  if (!scenario.recovery) return;
  const at = Array.isArray(session.recoveryAt) ? session.recoveryAt : [];
  at.forEach((index, i) => {
    if (index >= 0 && index <= scenario.turns.length) insertRecovery(index, i + 1);
  });
  session.recoveryAt = at;
}

async function start(forceNew) {
  const saved = forceNew ? null : store.load();

  // Resume a run of THIS chapter that has not already reached its end.
  //
  // A finished run stays in storage, so without the second half of this test tapping a
  // chapter you have completed drops you straight back onto its results screen. Tapping
  // a chapter means "play it". `turnIndex` counts the spliced list, so the end of the
  // chapter is its authored length plus however many recovery turns were inserted.
  const spliced = saved && Array.isArray(saved.recoveryAt) ? saved.recoveryAt.length : 0;
  const unfinished = saved && saved.scenarioId === scenario.id && Array.isArray(saved.history)
    && saved.turnIndex < scenario.turns.length + spliced;

  if (unfinished) {
    session = saved;
    session.sought = session.sought || [];
    session.fired = session.fired || [];
    session.state.pending = session.state.pending || [];
    restoreRecoveries();
  } else {
    session = newSession();
  }
  renderAll();
}

async function init() {
  cacheDom();

  let strings;
  let manifest;
  try {
    // Only the string table and the small chapter manifest load at startup. Scenario
    // files are fetched one at a time, when a chapter is chosen — learners pay per
    // megabyte (AGENTS.md section 3) and four scenarios is four times the download for
    // three they may never open.
    const [stringsRes, chaptersRes] = await Promise.all([
      fetch(UI_STRINGS_URL),
      fetch(CHAPTERS_URL),
    ]);
    if (!stringsRes.ok) throw new Error(`HTTP ${stringsRes.status}`);
    if (!chaptersRes.ok) throw new Error(`HTTP ${chaptersRes.status}`);
    strings = await stringsRes.json();
    manifest = await chaptersRes.json();
  } catch (err) {
    // No string table yet, so this one message cannot come from i18n.
    dom.situation.appendChild(ui.el('div', 'card',
      'Could not load the app content. If you opened this file directly, run it through a local web server instead — see app/README.md.'));
    console.error(err);
    return;
  }

  loadStrings(strings);
  chapters = (manifest && manifest.chapters) || [];
  carry = store.loadCarry();

  let preferred = null;
  try { preferred = localStorage.getItem(LANGUAGE_KEY); } catch { /* private mode */ }
  setLanguage(preferred || 'en');

  buildLanguageToggle();

  // "Start again" restarts the chapter in progress; from the select screen it goes
  // back to the select screen rather than silently reopening the last chapter.
  dom.reset.addEventListener('click', () => {
    store.clear();
    if (scenario) start(true); else renderChapterSelect();
    window.scrollTo({ top: 0 });
  });

  // Leaving a chapter does not discard it: the save stays, so reopening the same
  // chapter resumes where the learner stopped. Opening a different one starts that one
  // fresh, because there is a single save slot. Nothing is locked (ADR-0007).
  dom.chapters.addEventListener('click', () => {
    scenario = null;
    renderChapterSelect();
  });

  dom.pnlToggle.addEventListener('click', () => {
    const open = dom.pnlWrap.hasAttribute('hidden');
    if (open) dom.pnlWrap.removeAttribute('hidden');
    else dom.pnlWrap.setAttribute('hidden', '');
    dom.pnlToggle.setAttribute('aria-expanded', String(open));
    dom.pnlToggle.textContent = t(open ? 'btn.hideNumbers' : 'btn.showNumbers');
  });

  renderChrome();

  // Resume straight into whatever was in progress; otherwise choose a chapter.
  const saved = store.load();
  const resuming = saved && chapters.some((c) => c.id === saved.scenarioId);
  if (resuming) await openChapter(saved.scenarioId, false);
  else renderChapterSelect();
}

document.addEventListener('DOMContentLoaded', init);
