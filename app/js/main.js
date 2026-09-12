// Application bootstrap and turn state machine.
//
// Flow per turn: tap an action, then see the calculated result.
// Above the turn loop sits the chapter loop (ADR-0007): four chapters, each a
// self-contained scenario with an authored opening, connected by six carried flags.

import {
  createState, applyEffects, weeklyPnl, resolveTurn, CALCULATION_VERSION, cashBook,
  resolveNumberInput, resolveAllocation, bandForValue,
  evaluateGoal, needsRecovery, setBands,
} from './engine.js';
import * as record from './record.js';
import * as store from './storage.js';
import * as ui from './ui.js';
import { setCurrency, money, count, dateLong, proportion } from './format.js';
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
  dom.printRecord = q('print-record');
  dom.status = q('save-status');
  dom.record = q('record');
  dom.learners = q('learners');
  dom.business = q('business');
  dom.facts = q('facts');
}

function newSession() {
  return {
    id: store.newId(), profileId: store.profileId(),
    scenarioSnapshot: JSON.parse(JSON.stringify(scenario)),
    carryAtStart: JSON.parse(JSON.stringify(carry.flags)), openingNotes: carryIn.notes,
    authoredDone: 0, assistance: [], draftValue: null,
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
    record: { ...record.createRecord(scenario.id), scenarioVersion: scenario.version, calculationVersion: CALCULATION_VERSION },
  };
}

function persist() {
  return store.save(session, carry).then(ok => {
    if (dom.status) {
      dom.status.textContent = t(ok && !store.storageError ? 'save.ok' : 'save.failed');
      dom.status.classList.toggle('save-failed', !ok || Boolean(store.storageError));
    }
    return ok;
  });
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

/** The turn as the learner sees it, once their carried flags have tinted it. */
function tinted(turn) {
  const situation = situationFor(turn, session.carryAtStart || {});
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

  if (type === 'cashbook') return { keepsRecords: true };
  if (type === 'number') {
    return resolveNumberInput(session.state, turn.decision.input, session.inputValue);
  }
  if (type === 'allocate') {
    return resolveAllocation(session.state, turn.decision.allocate, session.split || {});
  }
  const opt = chosenOption();
  return (opt && opt.effects) || {};
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

  if (type === 'cashbook') return { outcome: turn.decision.outcome, lesson: turn.decision.lesson };
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

  if (type === 'cashbook') return money(session.inputValue);
  if (type === 'number') {
    const input = turn.decision.input;
    const value = input.displayPositive ? Math.abs(session.inputValue) : session.inputValue;
    const shown = input.valueAs === 'count' ? count(value) : money(value);
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

function focusTask() {
  const target = session?.phase === 'situation' ? dom.situation : dom.decision;
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  const view = dom.business.hidden ? target : dom.business;
  view.scrollIntoView({ block: 'start', behavior: 'instant' });
}
function assisted(id) {
  if (!session.assistance.includes(id)) {
    session.assistance.push(id);
    record.observe(session.record, { kind: 'assistance', turnId: currentTurn().id, helpId: id });
    persist();
  }
}
function addHelp(container, turn) {
  const help = ui.el('details', 'card learning-help');
  help.appendChild(ui.el('summary', null, t('help.title')));
  help.appendChild(ui.el('p', null, t(`help.${decisionType(turn)}`)));
  const worked = ui.el('div');
  if (decisionType(turn) === 'cashbook') {
    worked.appendChild(ui.el('p', null, t('book.example')));
  } else {
    ui.renderWorkout(worked, turn, '', session.state, () => { help.open = false; });
  }
  help.appendChild(worked);
  help.addEventListener('toggle', () => { if (help.open) assisted('worked-example'); });
  container.appendChild(help);
}

function renderAll() {
  if (session.phase === 'episode') { renderEpisode(); return; }
  const turn = currentTurn();
  if (!turn) { renderEnd(); return; }
  renderChrome();
  dom.pnlToggle.hidden = false;
  dom.pnlWrap.hidden = dom.pnlToggle.getAttribute('aria-expanded') !== 'true';
  ui.renderProgress(dom.progress, session.authoredDone || 0, 20);
  const mission = scenario.episodes?.[Math.min(3, Math.floor((session.authoredDone || 0) / 5))];
  if (mission) dom.progress.appendChild(ui.el('p', 'mission-title', localised(mission)));
  dom.progress.appendChild(ui.el('p', 'episode-progress', t('episode.progress', {
    episode: Math.min(4, Math.floor((session.authoredDone || 0) / 5) + 1),
    decision: (session.authoredDone || 0) % 5 + 1,
  })));
  if (session.phase === 'reveal') ui.clear(dom.situation);
  else ui.renderSituation(dom.situation, tinted(turn), session.authoredDone === 0 ? session.openingNotes || [] : []);
  dom.situation.querySelector('details')?.addEventListener('toggle', event => {
    if (!event.target.open) return;
    record.observe(session.record, { kind: 'context-opened', turnId: turn.id, beforeCommit: session.phase !== 'reveal' });
    persist();
  });
  ui.renderFacts(dom.facts, session.state);
  ui.renderStats(dom.stats, session.state);
  ui.renderScene(dom.scene, turn.scene, session.state, scenario.id);
  session.shownLines = ui.renderPnl(dom.pnl, session.state, session.seenLines || []);
  ui.renderTrajectory(dom.trajectory, session.state);
  if (scenario.goal) ui.renderGoal(dom.goal, evaluateGoal(session.state, scenario.goal), scenario.goal);
  ui.clear(dom.consequence);
  ui.clear(dom.info);
  if (session.phase === 'reveal') {
    ui.renderTurnResult(dom.decision, turn, session.result, narrativeFor(), decisionLabel(), onNext);
    return;
  }
  const ready = session.chosenOptionId || session.inputValue !== null || (decisionType(turn) === 'allocate' && session.phase === 'predict');
  const action = ui.el(ready ? 'details' : 'div', ready ? 'chosen-action' : '');
  ui.clear(dom.decision);
  if (ready) action.appendChild(ui.el('summary', null, t('play.edit', { choice: decisionLabel() })));
  dom.decision.appendChild(action);
  const controls = ui.el('div'); action.appendChild(controls);
  const type = decisionType(turn);
  const draft = value => { session.draftValue = value; if (session.inputValue !== null) session.inputValue = value; persist(); };
  if (turn.diagnose && session.diagnosed === null) {
    ui.renderDiagnose(controls, turn, session.state, onDiagnose);
  } else if (type === 'cashbook') {
    ui.renderCashBook(controls, cashBook(session.state), session.draftValue, onCommitNumber, draft);
  } else if (type === 'number') {
    ui.renderNumberDecision(controls, turn, session.state, onCommitNumber, session.draftValue ?? session.inputValue, draft);
  } else if (type === 'allocate') {
    ui.renderAllocateDecision(controls, turn, session.state, onCommitAllocation, session.split, split => { session.split = split; persist(); });
  } else {
    ui.renderOptions(controls, turn, onChooseOption, session.chosenOptionId);
  }
  // A previous saved draft can still be confirmed; new choices run immediately.
  if (ready) {
    const run = ui.el('button', 'btn btn-primary', t('turn.run'));
    run.dataset.role = 'run'; run.addEventListener('click', () => commitTurn());
    dom.decision.appendChild(run);
  }
  dom.decision.querySelector('.decision-calculation')?.addEventListener('toggle', event => { if (event.target.open) assisted('calculation-preview'); });
  addHelp(dom.decision, turn);
  ui.renderInfo(dom.info, turn, session.state, onSeekInfo, new Set(session.sought));
}

function onSeekInfo(item) {
  if (session.phase === 'reveal' || session.sought.includes(item.id)) return;
  session.turnOpening ||= JSON.parse(JSON.stringify(session.state));
  session.sought.push(item.id);
  session.state = { ...session.state, cash: session.state.cash - (item.costCash || 0), ownerHoursUsed: session.state.ownerHoursUsed + (item.costHours || 0) };
  record.observeInfoSought(session.record, currentTurn().id, item.id, item.id);
  persist(); renderAll();
}
function onDiagnose(pickedKey) {
  const turn = currentTurn();
  const answer = ui.diagnosisAnswer(turn, session.state);
  session.diagnosed = pickedKey;
  record.observeDiagnosis(session.record, turn.id, pickedKey, answer, pickedKey === answer);
  Object.assign(session.record.observations.at(-1), { assistance: [...session.assistance], beforeState: JSON.parse(JSON.stringify(session.state)) });
  persist(); renderAll(); focusTask();
}
function onChooseOption(option) {
  session.chosenOptionId = option.id;
  session.inputMethod = 'choice';
  commitTurn();
}
function onCommitNumber(value, method = 'typed') {
  const input = currentTurn().decision.input;
  if (!Number.isFinite(value) || (input && (value < input.min || value > input.max))) return;
  if (input && /(^|\.)(staff|capacity|demand)$/.test(input.field) && !Number.isInteger(value)) return;
  session.inputValue = value; session.draftValue = value; session.inputMethod = method;
  commitTurn();
}
function onCommitAllocation(split) {
  session.split = split; session.inputMethod = 'allocation';
  commitTurn();
}
function commitTurn() {
  if (session.phase === 'reveal') return;
  const turn = currentTurn();
  const beforeState = JSON.parse(JSON.stringify(session.state));
  const opt = chosenOption();
  const result = resolveTurn(session.state, turn, chosenEffects(), opt?.later || [], decisionLabel());
  if (session.turnOpening) {
    result.cash.direct += session.state.cash - session.turnOpening.cash;
    result.cash.opening = session.turnOpening.cash;
  }
  record.observeDecision(session.record, turn.id, turn.concept, opt?.id || decisionType(turn), decisionLabel(), session.sought.length, weeklyPnl(session.state).profit, result.profit / (turn.advanceWeeks || 1));
  const decision = session.record.observations.at(-1);
  Object.assign(decision, { input: session.inputValue, inputMethod: session.inputMethod || 'legacy-draft', allocation: session.split,
    assistance: [...session.assistance], beforeState, calculationVersion: CALCULATION_VERSION,
    scenarioVersion: scenario.version, interactionVersion: 2, forecast: 'not-requested' });
  if (decisionType(turn) === 'cashbook') {
    result.book = { ...cashBook(session.state), entered: session.inputValue };
    record.observe(session.record, { kind: 'cashbook', turnId: turn.id, ...result.book, assistance: [...session.assistance] });
  }
  if (turn.diagnose) result.diagnosis = { picked: session.diagnosed, answer: ui.diagnosisAnswer(turn, session.state), live: Boolean(turn.diagnose.liveConstraint) };
  record.observe(session.record, { kind: 'outcome', turnId: turn.id, cash: result.cash, profit: result.profit, state: result.state, calculationVersion: CALCULATION_VERSION });
  session.result = result; session.state = result.state;
  session.history.push(...result.weekly);
  session.phase = 'reveal';
  persist(); renderAll(); focusTask();
  ui.renderStats(dom.stats, session.state, beforeState);
  ui.animateTrade(dom.scene, result.cash.closing - result.cash.opening);
}
function onNext() {
  const turn = currentTurn();
  if (!turn.id.startsWith('recovery-')) session.authoredDone = (session.authoredDone || 0) + 1;
  if (!dom.pnlWrap.hidden) session.seenLines = [...new Set([...(session.seenLines || []), ...(session.shownLines || [])])];
  session.turnIndex += 1;
  Object.assign(session, { phase: 'situation', sought: [], chosenOptionId: null, predictedId: null, inputValue: null, split: null, diagnosed: null, predictedValue: null, draftValue: null, draftPrediction: null, inputMethod: null, assistance: [], turnOpening: null, result: null });
  if (scenario.recovery && needsRecovery(session.state) && session.recoveriesUsed < 2 && session.authoredDone < 20) {
    session.recoveriesUsed += 1; insertRecovery(session.turnIndex, session.recoveriesUsed); session.recoveryAt.push(session.turnIndex);
  }
  if (!turn.id.startsWith('recovery-') && session.authoredDone % 5 === 0 ) session.phase = 'episode';
  persist(); renderAll(); focusTask();
}
function renderEpisode() {
  renderChrome();
  ui.renderProgress(dom.progress, session.authoredDone, 20);
  dom.pnlWrap.hidden = true; dom.pnlToggle.hidden = true;
  for (const key of ['decision', 'situation', 'info', 'consequence']) ui.clear(dom[key]);
  const card = ui.el('section', 'card episode-recap');
  const finish = ui.el('div', 'episode-stamp', '✓'); finish.setAttribute('aria-hidden', 'true'); card.appendChild(finish);
  card.appendChild(ui.el('h2', null, t('episode.done', { n: session.authoredDone / 5 })));
  card.appendChild(ui.el('p', null, t('play.episodeBody')));
  const decisions = session.record.observations.filter(o => o.kind === 'decision' && !o.turnId.startsWith('recovery-')).slice(-5);
  const recap = ui.el('details'); recap.appendChild(ui.el('summary', null, t('play.recap')));
  for (const item of decisions) {
    const turn = scenario.turns.find(t => t.id === item.turnId);
    recap.appendChild(ui.el('p', null, localised(turn?.conceptLabel) || item.concept));
  }
  const last = decisions.at(-1);
  const definition = scenario.turns.find(t => t.id === last?.turnId);
  card.appendChild(ui.el('p', 'lesson', localised(definition?.takeaway) || t('episode.takeaway')));
  card.appendChild(recap);
  const next = ui.el('button', 'btn btn-primary', t('episode.continue'));
  next.addEventListener('click', () => { session.phase = 'situation'; persist(); renderAll(); focusTask(); });
  const stop = ui.el('button', 'btn btn-ghost', t('episode.stop'));
  stop.addEventListener('click', () => { scenario = null; renderChapterSelect(); });
  card.appendChild(next); card.appendChild(stop); dom.decision.appendChild(card);
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

  let saved;
  try { saved = forceNew ? null : await store.load(chapterId); }
  catch (error) { showSaveFailure(error, () => openChapter(chapterId, forceNew)); return false; }
  let loaded;
  try {
    const res = saved?.scenarioSnapshot ? { ok: true, json: async () => JSON.parse(JSON.stringify(saved.scenarioSnapshot)) } : await fetch(`./content/${chapter.file}`);
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
  try { await start(saved); }
  catch (error) { showSaveFailure(error, () => openChapter(chapterId, forceNew)); return false; }
  cacheChapter(chapter.file);
  return true;
}

/** Bank the six flags and note the chapter finished. Nothing is summed (ADR-0004). */
function bankCarry() {
  carry.flags = collectCarry(session.state, carry.flags);
  if (!carry.completed.includes(scenario.id)) carry.completed.push(scenario.id);
  store.saveCarry(carry);
}

function renderEnd(partial = false, recordOnly = false) {
  document.querySelector('.app').dataset.screen = 'end';
  dom.business.hidden = true;
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
  if (!partial && scenario.goal) {
    session.record.goalProgress = evaluateGoal(session.state, scenario.goal);
    ui.renderGoal(dom.goal, session.record.goalProgress, scenario.goal);
  }

  // The carried flags are banked here, at the one point a chapter is definitely
  // finished. They are facts about what was done, recorded alongside the observations
  // and never rolled into anything.
  if (!partial && !session.completed) {
    bankCarry(); session.completed = true;
    session.record.carriedFlags = { ...carry.flags };
    persist();
  }
  if (!session.completed) session.record.carriedFlags = collectCarry(session.state, session.carryAtStart || {});
  if (!partial && !recordOnly) {
    ui.renderChapterTransition(dom.decision, chapters, scenario.id, carry, session.state,
      id => openChapter(id), () => { scenario = null; renderChapterSelect(); },
      () => renderEnd(false, true));
    appendPortalLink();
    return;
  }
  const profile = record.buildProfile(session.record);
  const tally = record.predictionTally(session.record);
  ui.renderProfile(
    dom.decision, profile, tally, session.state, session.history,
    scenario.turns, session.record.observations, !partial,
  );

  const actions = ui.el('div', 'end-actions');

  // Whatever comes next in the manifest, offered but not imposed.
  const index = chapters.findIndex((c) => c.id === scenario.id);
  const next = index >= 0 ? chapters[index + 1] : null;
  if (!partial && next) {
    const onward = ui.el('button', 'btn btn-primary',
      `${t('btn.nextChapter')}: ${localised(next.title)}`);
    onward.type = 'button';
    onward.addEventListener('click', () => {
      openChapter(next.id);
      window.scrollTo({ top: 0 });
    });
    actions.appendChild(onward);
  }

  const chooser = ui.el('button', 'btn btn-ghost', t('btn.chooseChapter'));
  chooser.type = 'button';
  chooser.addEventListener('click', () => { scenario = null; renderChapterSelect(); });
  actions.appendChild(chooser);

  const again = ui.el('button', next ? 'btn btn-ghost' : 'btn btn-primary', t('btn.playAgain'));
  again.type = 'button';
  again.addEventListener('click', () => { openChapter(scenario.id, true); });
  actions.appendChild(again);

  // Three ways for the record to leave the phone, in descending order of reach on
  // the target devices: the native share sheet (WhatsApp and similar are how
  // documents actually move), print-to-PDF or paper, and a plain file download.
  // All three are local acts — nothing is transmitted anywhere by this app itself.
  const payload = buildRecordPayload(profile);

  if (navigator.canShare && navigator.canShare({ files: [recordFile(payload)] })) {
    const share = ui.el('button', 'btn btn-ghost', t('btn.shareRecord'));
    share.type = 'button';
    share.addEventListener('click', () => shareRecord(payload));
    actions.appendChild(share);
  }

  const print = ui.el('button', 'btn btn-ghost', t('btn.printRecord'));
  print.type = 'button';
  print.addEventListener('click', () => printRecord(profile));
  actions.appendChild(print);

  const download = ui.el('button', 'btn btn-ghost', t('btn.saveRecord'));
  download.type = 'button';
  download.addEventListener('click', () => downloadRecord(payload));
  actions.appendChild(download);

  if (partial || recordOnly) {
    const back = ui.el('button', 'btn btn-primary', t('record.back'));
    back.addEventListener('click', () => { renderAll(); focusTask(); });
    actions.appendChild(back);
  }
  if (session.state.pending?.length) dom.decision.appendChild(ui.el('p', null, t('result.pending', { n: session.state.pending.length })));
  dom.decision.appendChild(actions);
  if (!partial) appendPortalLink();
}

function appendPortalLink() {
  if (!chapters.every(chapter => carry.completed.includes(chapter.id))) return;
  if (location.protocol === 'file:') {
    dom.decision.appendChild(ui.el('p', null, t('portal.fileHint')));
    return;
  }
  const link = ui.el('a', 'btn btn-primary', t('portal.open'));
  link.href = './portal/';
  link.id = 'programme-portal';
  dom.decision.appendChild(link);
}

/** The learner holds their own record — SECURITY.md. Nothing is transmitted. */
function buildRecordPayload(profile) {
  // `carriedFlags` travels with the record because it is part of what was observed —
  // a learner arrived at this chapter having kept books, or not. It is a fact, listed
  // alongside the observations and never rolled into anything (ADR-0004).
  return {
    schemaVersion: 2, attemptId: session.id, localProfileId: session.profileId,
    scenarioVersion: session.record.scenarioVersion, calculationVersion: CALCULATION_VERSION,
    scenarioSnapshot: session.scenarioSnapshot, completed: Boolean(session.completed),
    openingCarry: session.carryAtStart ?? null,
    profile,
    scenarioId: session.record.scenarioId,
    carriedFlags: session.record.carriedFlags || {},
    observations: session.record.observations,
  };
}

/**
 * A file name a judge can tell apart in an inbox. The old name was
 * `record-<milliseconds>`, which made every submission look identical until opened.
 */
function recordFile(payload) {
  const day = new Date().toISOString().slice(0, 10);
  return new File(
    [JSON.stringify(payload, null, 2)],
    `MV-BS-RECORD-${session.record.scenarioId}-${day}-${session.id}.json`,
    { type: 'application/json' },
  );
}

function downloadBlob(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadRecord(payload) {
  downloadBlob(recordFile(payload));
}

/** Hand the record to whatever share targets the phone offers. */
async function shareRecord(payload) {
  try {
    await navigator.share({ files: [recordFile(payload)], title: t('app.title') });
  } catch (err) {
    if (err && err.name === 'AbortError') return; // the learner closed the share sheet
    console.warn('Sharing failed; saving instead:', err);
    downloadBlob(recordFile(payload));
  }
}

/**
 * The record as a printable page — paper or print-to-PDF is the one way a record
 * leaves a phone that has no share sheet, no connection and no other app. Localised
 * like the screen (it is read by someone the learner shows it to); the downloaded
 * JSON remains the canonical English artefact (record.js). The statements are the
 * same objects renderProfile shows, through ui.statementText, so the two cannot
 * drift apart.
 */
function printRecord(profile) {
  const root = dom.printRecord;
  ui.clear(root);

  root.appendChild(ui.el('h1', null, t('app.title')));
  root.appendChild(ui.el('p', 'print-meta', t('record.printMeta', {
    chapter: localised(scenario.title),
    date: dateLong(session.record.startedAt),
  })));

  const tally = record.predictionTally(session.record);
  if (tally.total > 0) {
    root.appendChild(ui.el('p', 'print-meta',
      `${t('profile.tallyLabel')}: ${proportion(tally.correct, tally.total)}`));
  }

  root.appendChild(ui.el('h2', null, t('profile.title')));
  for (const s of profile.statements) {
    const item = ui.el('div', 'print-statement');
    item.appendChild(ui.el('div', 'print-indicator',
      s.indicatorKey ? t(s.indicatorKey) : s.indicator));
    item.appendChild(ui.el('div', null, ui.statementText(s)));
    if (s.detailKey || s.detail) {
      item.appendChild(ui.el('div', null, s.detailKey ? t(s.detailKey) : s.detail));
    }
    root.appendChild(item);
  }

  root.appendChild(ui.el('h2', null, t('profile.limitationsTitle')));
  const ul = ui.el('ul', null);
  for (const key of profile.limitationKeys) ul.appendChild(ui.el('li', null, t(key)));
  root.appendChild(ul);

  root.appendChild(ui.el('p', 'print-meta', t('record.canonicalNote')));

  window.print();
}

// --- chrome --------------------------------------------------------------

/** Strings that live outside the turn loop and so are not redrawn by renderAll. */
function renderChrome() {
  document.querySelector('.app').dataset.screen = !scenario ? 'home' : session?.phase || 'situation';
  dom.business.hidden = !scenario || session?.phase === 'episode';
  document.title = localised(scenario && scenario.title) || t('app.title');
  dom.title.textContent = localised(chapters.find(c => c.id === scenario?.id)?.title) || t('app.title');
  if (!scenario) { dom.banner.hidden = true; }
  dom.reset.textContent = t('btn.startAgain');
  dom.record.textContent = t('record.open'); dom.record.hidden = !scenario;
  dom.learners.textContent = t('learner.switch');

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

async function start(saved) {
  // Completed attempts reopen their record. A replay creates a separate attempt.
  const spliced = saved && Array.isArray(saved.recoveryAt) ? saved.recoveryAt.length : 0;
  const unfinished = saved && saved.scenarioId === scenario.id && Array.isArray(saved.history)
    && saved.turnIndex <= scenario.turns.length + spliced;
  if (saved && !unfinished) throw new Error('Saved progress needs review');

  if (unfinished) {
    session = saved;
    session.sought = session.sought || [];
    session.fired = session.fired || [];
    session.state.pending = session.state.pending || [];
    session.assistance ||= [];
    session.authoredDone ??= Math.max(0, session.turnIndex - (session.recoveryAt || []).filter(i => i < session.turnIndex).length);
    if (session.legacy) {
      const done = session.record.observations.filter(o => o.kind === 'decision');
      const authored = done.filter(o => !o.turnId.startsWith('recovery-')).map(o => o.turnId);
      if (new Set(authored).size !== authored.length || authored.some(id => !scenario.turns.some(t => t.id === id))) throw new Error('Legacy decisions need review');
      // Preserve the observed order. New content may have moved unplayed decisions.
      const remaining = scenario.turns.filter(t => !authored.includes(t.id));
      const pendingId = session.record.observations.findLast(o => !authored.includes(o.turnId) && remaining.some(t => t.id === o.turnId))?.turnId;
      if (pendingId) remaining.unshift(...remaining.splice(remaining.findIndex(t => t.id === pendingId), 1));
      scenario.turns = [...authored.map(id => scenario.turns.find(t => t.id === id)), ...remaining];
      session.authoredDone = authored.length;
      session.turnIndex = done.length;
      session.recoveryAt = done.flatMap((o, index) => o.turnId.startsWith('recovery-') ? [index] : []);
      const legacyDraft = { phase: session.phase, chosenOptionId: session.chosenOptionId, inputValue: session.inputValue, split: session.split, predictedId: session.predictedId, predictedValue: session.predictedValue };
      for (const observation of session.record.observations) observation.provenance = 'legacy-unknown';
      session.state = createState(session.state);
      record.observe(session.record, { kind: 'calculation-transition', from: 'legacy-unknown', to: CALCULATION_VERSION, legacyDraft, remainingTurnIds: remaining.map(t => t.id) });
      session.phase = 'situation'; session.chosenOptionId = null; session.predictedId = null; session.inputValue = null;
      session.legacy = false;
    }
    session.scenarioSnapshot ||= JSON.parse(JSON.stringify(scenario));
    restoreRecoveries();
  } else {
    session = newSession();
  }
  await persist();
  renderAll();
  focusTask();
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
      document.getElementById('load-error')?.textContent || ''));
    console.error(err);
    return;
  }

  loadStrings(strings);
  chapters = (manifest && manifest.chapters) || [];
  await store.init();
  carry = await store.loadCarry();

  let preferred = null;
  try { preferred = localStorage.getItem(LANGUAGE_KEY); } catch { /* private mode */ }
  setLanguage(preferred || 'en');

  buildLanguageToggle();

  // "Start again" restarts the chapter in progress; from the select screen it goes
  // back to the select screen rather than silently reopening the last chapter.
  dom.reset.addEventListener('click', () => {
    if (scenario) openChapter(scenario.id, true); else renderChapterSelect();
    window.scrollTo({ top: 0 });
  });

  // Leaving a chapter does not discard it: the save stays, so reopening the same
  // chapter resumes where the learner stopped. Opening a different one starts that one
  // or resumes its own saved attempt. Nothing is locked (ADR-0007).
  dom.chapters.addEventListener('click', () => {
    scenario = null;
    renderChapterSelect();
  });

  dom.pnlToggle.addEventListener('click', () => {
    const open = dom.pnlWrap.hasAttribute('hidden');
    if (open && session && currentTurn() && session.phase !== 'reveal') assisted('detailed-accounts');
    if (open) dom.pnlWrap.removeAttribute('hidden');
    else dom.pnlWrap.setAttribute('hidden', '');
    dom.pnlToggle.setAttribute('aria-expanded', String(open));
    dom.pnlToggle.textContent = t(open ? 'btn.hideNumbers' : 'btn.showNumbers');
  });

  dom.record.addEventListener('click', () => renderEnd(!session.completed, true));
  dom.learners.addEventListener('click', showLearners);
  dom.status.addEventListener('click', () => { if (session) persist(); });
  if (store.storageError) dom.status.textContent = t('save.failed');
  renderChrome();

  // Resume straight into whatever was in progress; otherwise choose a chapter.
  let saved;
  try { saved = await store.load(); }
  catch (error) { showSaveFailure(error, () => window.location.reload()); return; }
  const resuming = saved && chapters.some((c) => c.id === saved.scenarioId);
  if (resuming) await openChapter(saved.scenarioId, false);
  else renderChapterSelect();
}

async function cacheChapter(file) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();
    channel.port1.onmessage = event => {
      if (event.data.ready && dom.status && !store.storageError) dom.status.textContent = t('save.offline');
      channel.port1.close();
    };
    registration.active?.postMessage({ type: 'CACHE_CHAPTER', url: `./content/${file}` }, [channel.port2]);
  } catch { /* Save status remains available; do not claim offline readiness. */ }
}
function showSaveFailure(error, retry) {
  store.storageError || console.error(error);
  ui.clear(dom.decision); ui.clear(dom.situation);
  dom.status.textContent = t('save.failed');
  const card = ui.el('section', 'card');
  card.appendChild(ui.el('p', null, t('save.review')));
  const again = ui.el('button', 'btn btn-primary', t('save.retry'));
  again.addEventListener('click', retry); card.appendChild(again);
  const backup = ui.el('button', 'btn btn-ghost', t('save.backup'));
  backup.addEventListener('click', async () => downloadBlob(new File([JSON.stringify(await store.backup(true))], 'MV-BS-LOCAL-BACKUP.json', { type: 'application/json' })));
  card.appendChild(backup); dom.decision.appendChild(card);
}
async function showLearners() {
  ui.clear(dom.decision); ui.clear(dom.situation); ui.clear(dom.info);
  dom.decision.appendChild(ui.el('p', 'card', t('learner.help')));
  const list = await store.profiles();
  for (const [index, profile] of list.entries()) {
    const button = ui.el('button', 'btn btn-ghost', t('learner.number', { n: profile.number || index + 1 }));
    button.setAttribute('aria-pressed', String(profile.id === store.profileId()));
    button.addEventListener('click', async () => { await store.switchProfile(profile.id); carry = await store.loadCarry(); scenario = null; session = null; renderChapterSelect(); });
    dom.decision.appendChild(button);
  }
  const add = ui.el('button', 'btn btn-primary', t('learner.new'));
  add.addEventListener('click', async () => { await store.switchProfile(); carry = await store.loadCarry(); scenario = null; session = null; renderChapterSelect(); });
  dom.decision.appendChild(add);
  const backup = ui.el('button', 'btn btn-ghost', t('save.backup'));
  backup.addEventListener('click', async () => downloadBlob(new File([JSON.stringify(await store.backup(true))], 'MV-BS-LOCAL-BACKUP.json', { type: 'application/json' })));
  dom.decision.appendChild(backup);
  const attempts = (await store.backup(true)).filter(([key]) => key.startsWith('attempt:')).map(([, value]) => value);
  for (const attempt of attempts) {
    const item = chapters.find(c => c.id === attempt.scenarioId);
    const button = ui.el('button', 'btn btn-ghost', t('record.attempt', { chapter: localised(item?.title) || attempt.scenarioId, date: dateLong(attempt.record?.startedAt || attempt.updatedAt) }));
    button.addEventListener('click', async () => {
      await store.selectAttempt(attempt.id);
      carry = await store.loadCarry(); if (!await openChapter(attempt.scenarioId)) return;
      renderEnd(!attempt.completed);
    });
    dom.decision.appendChild(button);
  }
  const remove = ui.el('button', 'btn btn-ghost', t('learner.delete'));
  remove.addEventListener('click', async () => {
    if (!window.confirm(t('learner.confirmDelete'))) return;
    await store.deleteProfile(store.profileId()); carry = await store.loadCarry(); scenario = null; session = null; renderChapterSelect();
  });
  dom.decision.appendChild(remove);
}
const boot = () => init().catch(error => {
  console.error(error);
  if (dom.status) dom.status.textContent = t('save.failed');
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
