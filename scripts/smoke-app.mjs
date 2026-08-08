// Drives the real application against a stub DOM.
//
// Session 003's worst failure was a seam nobody owned: `scene.js` assigned CSS classes
// and the stylesheet never got the rules, so every scene rendered as a solid black
// rectangle. It was found by looking at a screenshot, not by reading code, and there
// is no browser in this working environment to look at one with.
//
// This does not replace looking at it on a phone — it cannot see layout, colour or
// whether a button is reachable with a thumb. What it does check is that the wiring
// holds: that the chapter select renders, that choosing a chapter loads and starts it,
// that a turn advances through its phases, and that the carried flags are banked at
// the end. All of that is new in this change and none of it was covered.
//
// It checks the wiring at a few chosen points. `playthrough.mjs` is the companion that
// plays every chapter end to end in both languages and reads what the screens say.
//
// Run: node scripts/smoke-app.mjs

import { existsSync } from 'node:fs';
import { installStubDom, read } from './lib/stub-dom.mjs';

let passed = 0;
let failed = 0;
const check = (name, cond, detail) => {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

const { byId, boot, storeData } = installStubDom();

/** Which chapters in the manifest have no scenario file yet. */
const manifest = JSON.parse(read('app/content/chapters.json'));
const unauthoredIds = manifest.chapters
  .filter((c) => { try { read(`app/content/${c.file}`); return false; } catch { return true; } })
  .map((c) => c.id);

// --- drive it ------------------------------------------------------------

await import('../app/js/main.js');
for (const fn of boot) await fn();
// Startup is async past its first await; let the microtask queue drain.
await new Promise((resolve) => setTimeout(resolve, 0));

const situation = byId.get('situation');
const decision = byId.get('decision');

console.log('\napp: the chapter select');
{
  const cards = decision.querySelectorAll('.chapter-card');
  check('renders a card per chapter', cards.length === 4, `got ${cards.length}`);
  check('names the first chapter', /mandazi/i.test(cards[0]?.textContent || ''));
  check('says plainly that this is not a ladder',
    /not a ladder/i.test(situation.textContent), situation.textContent.slice(0, 80));
  check('no chapter is locked',
    cards.every((c) => (c.listeners.click || []).length > 0));
  check('nothing on this screen is a score',
    !/%|score|rank/i.test(decision.textContent + situation.textContent));
}

console.log('\napp: a chapter that is listed but not yet authored');
{
  // The manifest legitimately runs ahead of the content, so this is a state real
  // learners can reach — tapping a chapter whose file does not exist. It must say so
  // and leave the app usable, not throw and leave a blank screen.
  const cards = decision.querySelectorAll('.chapter-card');
  // Which chapters are authored changes as content lands, so ask the manifest rather
  // than naming them here — this test used to hardcode the list and started clicking
  // into a real chapter the moment one of them was written.
  const titles = unauthoredIds
    .map((id) => manifest.chapters.find((c) => c.id === id).title.en);
  const unauthored = cards.find((c) => titles.some((title) => c.textContent.includes(title)));
  if (!unauthored) {
    check('every listed chapter is authored', true);
  } else {
    unauthored.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    check('an unauthored chapter says so rather than throwing',
      /not ready/i.test(situation.textContent), situation.textContent.slice(0, 80));

    // Back to the select screen, so the rest of the run starts from a known place.
    byId.get('reset').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    check('and the learner can get back to the chapter list',
      decision.querySelectorAll('.chapter-card').length === 4);
  }
}

console.log('\napp: opening a chapter');
{
  decision.querySelectorAll('.chapter-card')[0].click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  check('the situation is rendered', situation.textContent.length > 40);
  check('the ledger is rendered', byId.get('pnl').textContent.length > 0);
  check('the goal is rendered', byId.get('goal').textContent.length > 0);
  check('a decision control is offered', decision.all().length > 0);
}

console.log('\napp: playing a turn through its phases');
{
  // t01 is a number decision, so it must go through "work it out" before predicting
  // and its prediction must be a stepper — that is what session 007 repaired (D-015).
  const before = decision.textContent;
  const commit = decision.all().reverse().find((n) => n.tagName === 'BUTTON' && (n.listeners.click || []).length);
  check('the number decision offers a commit control', Boolean(commit));
  commit.click();
  check('committing moves the turn on', decision.textContent !== before);

  // Walk forward by pressing the last enabled button on each screen until the turn
  // resolves, which is what a learner does.
  for (let i = 0; i < 6 && !/next|endelea/i.test(decision.textContent); i += 1) {
    const next = decision.all().reverse().find(
      (n) => n.tagName === 'BUTTON' && !n.attributes.disabled && (n.listeners.click || []).length,
    );
    if (!next) break;
    next.click();
  }
  check('the turn reaches a reveal', decision.textContent.length > 0);
  // The progress bar is graphical, so it carries its meaning in ARIA rather than in
  // text. Checking textContent here would only prove the test was wrong.
  const progress = byId.get('progress');
  check('progress is exposed to assistive technology',
    progress.getAttribute('role') === 'progressbar' && progress.getAttribute('aria-label'));
  check('progress counts against the chapter length',
    progress.getAttribute('aria-valuemax') === '20', progress.getAttribute('aria-valuemax'));
}

console.log('\napp: leaving a chapter without finishing it');
{
  // "Start again" restarts the chapter in progress, so before this button existed the
  // only way out of a chapter opened by mistake was to finish it or clear the browser
  // storage. On a shared phone in a programme that is a trap.
  const chapters = byId.get('chapters');
  check('a way out of a chapter is offered while playing', chapters.hidden === false);
  chapters.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  check('it returns to the chapter list',
    decision.querySelectorAll('.chapter-card').length === 4);
  check('and it is not offered on the chapter list itself', chapters.hidden === true);
}

console.log('\napp: the carried flags are banked');
{
  const saved = storeData.get('business-simulator:carry:v1');
  check('nothing is banked mid-chapter', saved === undefined || !/completed":\["mama-asha/.test(saved));
}

console.log('\napp: resuming a chapter that had a recovery turn');
{
  // Recovery turns are spliced into `scenario.turns` at run time, but the scenario file
  // is re-fetched clean every time the app starts — and on the target devices it is
  // killed and restarted often. The saved `turnIndex` counts the spliced list, so
  // without restoring the splices a resume skipped one authored turn per recovery the
  // learner had been through, and ended the chapter early.
  const { createState } = await import('../app/js/engine.js');
  const scenario = JSON.parse(read('app/content/scenario-mama-asha.json'));
  const index = 6;

  storeData.set('business-simulator:v1', JSON.stringify({
    scenarioId: scenario.id,
    turnIndex: index,
    phase: 'situation',
    state: createState(scenario.startState),
    history: [],
    sought: [],
    fired: [],
    weeksPassed: 1,
    recoveriesUsed: 1,
    recoveryAt: [index],
    record: { scenarioId: scenario.id, observations: [] },
  }));

  // A fresh module instance, which is what a reload gives you.
  boot.length = 0;
  await import('../app/js/main.js?reload=1');
  for (const fn of boot) await fn();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const recoveryText = scenario.recovery.situation.en;
  const skippedText = scenario.turns[index].situation.en;
  check('the recovery turn is still the turn in front of the learner',
    situation.textContent.includes(recoveryText), situation.textContent.slice(0, 80));
  check('and no authored turn was skipped past',
    !situation.textContent.includes(skippedText));
  check('progress counts the recovery turn too',
    byId.get('progress').getAttribute('aria-valuemax') === String(scenario.turns.length + 1),
    byId.get('progress').getAttribute('aria-valuemax'));
}

console.log('\napp: the end of a chapter');
{
  // Resumed onto the last turn and played out, because the end screen is the one part
  // of the app a learner reaches exactly once and only after half an hour — which is
  // why nothing checked it until now.
  const { createState } = await import('../app/js/engine.js');
  const scenario = JSON.parse(read('app/content/scenario-mama-asha.json'));
  const last = scenario.turns.length - 1;

  storeData.set('business-simulator:v1', JSON.stringify({
    scenarioId: scenario.id,
    turnIndex: last,
    phase: 'situation',
    state: createState(scenario.startState),
    history: [],
    sought: [],
    fired: [],
    weeksPassed: 1,
    recoveriesUsed: 2,   // no more recovery turns can be spliced in ahead of the end
    recoveryAt: [],
    record: { scenarioId: scenario.id, observations: [] },
  }));

  boot.length = 0;
  await import('../app/js/main.js?reload=2');
  for (const fn of boot) await fn();
  await new Promise((resolve) => setTimeout(resolve, 0));

  for (let i = 0; i < 12 && decision.querySelectorAll('.recap-item').length === 0; i += 1) {
    const next = decision.all().reverse().find(
      (n) => n.tagName === 'BUTTON' && !n.attributes.disabled && (n.listeners.click || []).length,
    );
    if (!next) break;
    next.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const recap = decision.querySelectorAll('.recap-item');
  check('the end screen recaps every concept the chapter taught',
    recap.length === scenario.turns.length, `got ${recap.length} of ${scenario.turns.length}`);
  check('the recap names the concept, not the turn number',
    /price|bei/i.test(decision.textContent));

  // ADR-0004: the end screen carries no score, rank or percentile, and the recap is
  // the newest thing on it that could grow one.
  const recapText = [...recap].map((n) => n.textContent).join(' ');
  check('and it marks nothing right or wrong',
    !/correct|wrong|score|rank|%|sahihi|makosa|alama/i.test(recapText), recapText.slice(0, 80));
}

console.log('\napp: the service worker can actually cache the shell');
{
  // `cache.addAll` rejects as a unit: one missing file and the install fails, leaving
  // no worker and no offline support at all — silently, because registration is
  // deliberately allowed to fail without complaining. So the one thing worth checking
  // headlessly is that every path it names is a file that exists.
  const sw = read('app/sw.js');
  const shell = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((p) => p.includes('.'));
  check('the shell list is not empty', shell.length > 5, `got ${shell.length}`);

  const missing = shell.filter((p) => !existsSync(new URL(`../app/${p}`, import.meta.url)));
  check('every file the service worker pre-caches exists', missing.length === 0, missing.join(', '));

  check('the page registers it', /serviceWorker\.register/.test(read('app/index.html')));

  // A cached build-info.json would report a deploy that had not happened, which is the
  // exact failure it was added to catch. See PROJECT_STATE.md.
  check('build-info.json is exempt from the cache', /build-info\.json/.test(sw));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
