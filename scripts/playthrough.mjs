// Plays every chapter to the end, in both languages, through the real interface.
//
// `smoke-app.mjs` checks the wiring at a few chosen points: the select screen renders,
// one turn advances, the end screen recaps. That left the thing the owner actually does
// — sit down and play a chapter — checked by nobody, and the defects that survive are
// exactly the ones only a playthrough meets. Two of them were live when this was
// written: every work-it-out card in chapters 2 to 4 priced the goods at zero, and
// leaving a chapter to look at the chapter list threw the run away.
//
// What it can see: what each screen says, whether a control moves, whether a button
// leads anywhere, whether a number is a real number. What it cannot see: layout,
// colour, tap targets, or anything about a phone. Those still need a phone.
//
// Run: node scripts/playthrough.mjs [-v]

import { installStubDom, settle, read } from './lib/stub-dom.mjs';
import { weeklyPnl, netWorth } from '../app/js/engine.js';

const verbose = process.argv.includes('-v');

let passed = 0;
const failures = [];
const check = (name, cond, detail) => {
  if (cond) {
    passed += 1;
    if (verbose) console.log(`    ok   ${name}`);
  } else {
    failures.push({ name, detail });
    console.error(`    FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

// A failure that is true on every turn would otherwise print sixty times and bury the
// rest. Report each distinct problem once, with the first place it was seen.
const seenOnce = new Set();
const checkOnce = (id, name, cond, detail) => {
  if (cond) { passed += 1; return; }
  if (seenOnce.has(id)) return;
  seenOnce.add(id);
  failures.push({ name, detail });
  console.error(`    FAIL ${name}${detail ? ` — ${detail}` : ''}`);
};

const { byId, boot, storeData } = installStubDom();

const manifest = JSON.parse(read('app/content/chapters.json'));
const scenarios = new Map(manifest.chapters.map((c) => {
  try { return [c.id, JSON.parse(read(`app/content/${c.file}`))]; } catch { return [c.id, null]; }
}));

await import('../app/js/main.js');
for (const fn of boot) await fn();
await settle();

const dom = Object.fromEntries(
  ['stats', 'situation', 'info', 'decision', 'consequence', 'pnl', 'trajectory', 'goal',
    'banner', 'progress', 'chapters', 'lang', 'title', 'reset', 'pnl-toggle', 'pnl-wrap']
    .map((id) => [id, byId.get(id)]),
);

/** The session the app has actually saved — the same state the screen was drawn from. */
function liveState() {
  const raw = storeData.get('business-simulator:v1');
  if (!raw) return null;
  try { return JSON.parse(raw).state; } catch { return null; }
}

/**
 * The saved state, but only when it is this chapter's.
 *
 * A new session is not written to storage until the learner acts, so on the first screen
 * of a chapter the save still describes the one before it — and the ledger is on screen
 * from that very first render. Comparing the two then compares a bakery panel against a
 * stall's state, which is a bug in the check and not in the app.
 */
function liveStateOf(chapterId) {
  const raw = storeData.get('business-simulator:v1');
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    return saved.record && saved.record.scenarioId === chapterId ? saved.state : null;
  } catch { return null; }
}

/**
 * Every currency amount in a string, as numbers.
 *
 * money() puts the sign in front of the currency code — "-TZS 54,000" — so a negative
 * amount is only negative if this reads the character before the code.
 */
function amountsIn(text) {
  return [...String(text).matchAll(/(-?)([A-Z]{3})\s([\d.,]+)/g)]
    .map((m) => Number(m[1] + m[3].replace(/[^\d]/g, '')));
}

/** Every price a learner could be quoted for one unit of anything they sell. */
function realPrices(state) {
  const prices = [];
  if (Number(state.price)) prices.push(Number(state.price));
  for (const line of state.lines || []) if (Number(line.price)) prices.push(Number(line.price));
  return prices;
}

function realUnitCosts(state) {
  const costs = [];
  if (Number(state.unitCost)) costs.push(Number(state.unitCost));
  for (const line of state.lines || []) if (Number(line.unitCost)) costs.push(Number(line.unitCost));
  return costs;
}

// --- what every screen must be true of -----------------------------------

const CONTAINERS = ['stats', 'situation', 'info', 'decision', 'consequence', 'pnl',
  'trajectory', 'goal', 'banner'];

// t() returns the key when a string is missing, so an untranslated key reaches the
// screen as literal "pnl.sales". validate-i18n catches the keys the code asks for by
// name; this catches the ones it builds at run time.
const LOOKS_LIKE_A_KEY = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/;

function auditScreen(where) {
  for (const name of CONTAINERS) {
    const container = dom[name];
    if (!container) continue;
    for (const node of [container, ...container.all()]) {
      const own = node.ownText;
      if (!own) continue;

      if (/NaN|undefined|\[object Object\]|Infinity/.test(own)) {
        checkOnce(`broken-number:${where.chapter}:${name}`,
          `${where.chapter}/${where.lang}: no broken values on screen`,
          false, `${name}: "${own.slice(0, 90)}"`);
      }
      if (/\{\w+\}/.test(own)) {
        checkOnce(`placeholder:${where.chapter}:${name}`,
          `${where.chapter}/${where.lang}: every placeholder is filled in`,
          false, `${name}: "${own.slice(0, 90)}"`);
      }
      if (LOOKS_LIKE_A_KEY.test(own.trim())) {
        checkOnce(`missing-string:${where.chapter}:${where.lang}:${own.trim()}`,
          `${where.chapter}/${where.lang}: no untranslated key on screen`,
          false, `${name}: "${own.trim()}"`);
      }
    }
  }
}

/**
 * The work-it-out card is a column of figures with a total under it, shown to a learner
 * who is about to predict a profit from them. So the column has to add up, and every
 * per-unit figure it quotes has to be one the business actually trades at.
 *
 * Both were false when this was written. Chapters 2 to 4 quoted the engine's default
 * price of 500 and unit cost of 300 — chapter 1's mandazi, in a bakery selling bread at
 * 1,200 — so a learner who multiplied the two numbers on the card got a third number
 * that was not on it. And spoilage, freight, duty and currency were left out of the sum
 * in every chapter, so the rows did not reach the total whenever any of them was live.
 */
function auditWorkout(where) {
  const card = dom.decision.querySelector('.workout');
  if (!card) return;
  const state = liveState();
  if (!state) return;

  const rows = card.querySelectorAll('.workout-row');
  const parts = rows.filter((r) => !r.classList.contains('total'));
  const totalRow = rows.find((r) => r.classList.contains('total'));
  if (!parts.length || !totalRow) return;

  const valueOf = (row) => amountsIn(row.querySelector('.workout-value')?.textContent || '')[0] ?? 0;
  const sum = parts.reduce((acc, row) => acc + valueOf(row), 0);
  // Against the engine's profit rather than the total row, which counts up from zero on
  // an animation and is therefore mid-flight whenever this reads it.
  const total = weeklyPnl(state).profit;

  // Rounding: each row is rounded to the shilling for display, so allow one per row.
  checkOnce(`workout-sum:${where.chapter}`,
    `${where.chapter}: the work-it-out column adds up to the profit it claims`,
    Math.abs(sum - total) <= parts.length,
    `rows come to ${sum}, the week's profit is ${total} (${where.turn})`);

  // Any per-unit figure quoted in a row label must be a real one. In a single-product
  // chapter that is the price and the unit cost; in a mix it is what each line keeps.
  const real = new Set([...realPrices(state), ...realUnitCosts(state),
    ...(state.lines || []).map((l) => Number(l.price) - Number(l.unitCost))]);
  for (const row of parts) {
    const label = row.querySelector('.workout-label')?.textContent || '';
    for (const amount of amountsIn(label)) {
      if (amount === 0) continue;
      checkOnce(`workout-unit:${where.chapter}`,
        `${where.chapter}: every per-unit figure on the work-it-out card is one the business trades at`,
        real.has(amount),
        `card says ${amount}; the business trades at ${[...real].join('/')} (${where.turn})`);
    }
  }
}

/**
 * The money panel is the one screen a learner is told to read, and D-023 asks the same
 * of it as of the work-it-out card: every column adds up. Its rows are signed already —
 * money in positive, money out negative — so they must come to the profit line printed
 * under them, and to the profit the engine computed.
 *
 * The workout card was checked from the session it was written; this was not, and the
 * two are not the same screen. A cost the engine charges and the panel has no row for
 * would leave the learner an unexplained gap in the one place they are meant to look.
 */
function auditLedger(where) {
  const card = dom.pnl.querySelector('.ledger');
  if (!card) return;
  const state = liveStateOf(where.chapter);
  if (!state) return;

  const rows = card.querySelectorAll('.ledger-row');
  const parts = rows.filter((r) => !r.classList.contains('total'));
  const totalRow = rows.find((r) => r.classList.contains('total')
    && !r.classList.contains('cash-flow'));
  if (!parts.length || !totalRow) return;

  const valueOf = (row) => amountsIn(row.querySelector('.ledger-value')?.textContent || '')[0] ?? 0;
  const sum = parts.reduce((acc, row) => acc + valueOf(row), 0);
  const printed = valueOf(totalRow);
  const profit = weeklyPnl(state).profit;

  checkOnce(`ledger-sum:${where.chapter}`,
    `${where.chapter}: the money panel's rows add up to the profit printed under them`,
    sum === printed,
    `rows come to ${sum}, the panel says ${printed} (${where.turn})`);

  // A cost that pays you is how a broken opening figure surfaces on screen: the factory
  // once printed "Interest on the loan" in the money-coming-in column, because a carry
  // rule had opened it at a negative interest rate. The panel was internally consistent
  // the whole time — the row summed into the profit correctly — so only the direction
  // gives it away.
  const backwards = parts.filter((r) => r.classList.contains('out') && valueOf(r) > 0);
  checkOnce(`ledger-direction:${where.chapter}`,
    `${where.chapter}: nothing in the money-going-out column is money coming in`,
    backwards.length === 0,
    backwards.map((r) => `"${r.querySelector('.ledger-label')?.textContent}" is ${valueOf(r)}`)
      .join(', ') + ` (${where.turn})`);

  checkOnce(`ledger-profit:${where.chapter}`,
    `${where.chapter}: the profit the money panel prints is the profit the week made`,
    printed === profit,
    `panel says ${printed}, the week made ${profit} (${where.turn})`);
}

/**
 * What the business is worth is the only figure on the panel that is a stock rather
 * than a week, and it is the one a learner cannot check by adding up the rows above it.
 * So it is checked against the engine directly, and the lender's sentence is checked to
 * appear only when there is actually a lender.
 */
function auditWorth(where) {
  // The panel is cleared on the end screen, where a week's ledger would be meaningless.
  // Anywhere it is drawn at all, the worth block is part of it.
  if (!dom.pnl.querySelector('.ledger')) return;
  const card = dom.pnl.querySelector('.worth');
  const state = liveStateOf(where.chapter);
  if (!state) return;

  checkOnce(`worth-shown:${where.chapter}`,
    `${where.chapter}: the money panel says what the business is worth`,
    Boolean(card), `no worth card on ${where.turn}`);
  if (!card) return;

  const shown = amountsIn(card.querySelector('.worth-value')?.textContent || '')[0];
  checkOnce(`worth-figure:${where.chapter}`,
    `${where.chapter}: what the panel says the business is worth is what it is worth`,
    shown === netWorth(state),
    `panel says ${shown}, the engine says ${netWorth(state)} (${where.turn})`);

  const saysLender = card.querySelectorAll('.worth-note').length > 0;
  checkOnce(`worth-lender:${where.chapter}`,
    `${where.chapter}: the lender's claim is mentioned when there is a lender, and not otherwise`,
    saysLender === ((Number(state.debt) || 0) > 0),
    `debt is ${state.debt || 0} and the panel ${saysLender ? 'does' : 'does not'} mention a lender (${where.turn})`);
}

/**
 * Money tied up in the trading cycle — ingredients bought and not yet sold — is the one
 * figure in this game that a business can have a great deal of and not be able to spend.
 * Chapter 1 carries it from its first week now, so it is no longer a chapters 2-4 idea.
 *
 * It appears on NO row of the weekly ledger, because it is not a cost: it moves cash and
 * leaves profit alone. That makes it the easiest thing in the game to get wrong on
 * screen in either direction — a phantom row that makes the panel stop adding up, or a
 * worth figure that quietly leaves the stock out and reports the business as poorer than
 * it is. This asserts both directions, on the screen the learner is reading.
 *
 * `chaptersWithStock` records where it was actually met, so the two checks below cannot
 * pass by never having been reached.
 */
const chaptersWithStock = new Set();
function auditWorkingCapital(where) {
  const state = liveStateOf(where.chapter);
  if (!state) return;
  const held = Number(state.wcHeld) || 0;
  if (held === 0) return;
  chaptersWithStock.add(where.chapter);

  // Not in the profit. Zeroing the three terms working capital is made of must leave
  // every line of the week untouched.
  const flat = weeklyPnl({ ...state, debtorWeeks: 0, inventoryWeeks: 0, creditorWeeks: 0 });
  checkOnce(`wc-not-a-cost:${where.chapter}`,
    `${where.chapter}: money tied up in stock changes no line of the week's profit`,
    weeklyPnl(state).profit === flat.profit,
    `profit ${weeklyPnl(state).profit} with the terms, ${flat.profit} without (${where.turn})`);

  // But in the worth. The learner cannot add this one up from the rows, so the only
  // check available is that the printed figure is the one that counts the stock, and
  // not the one that forgot it.
  const card = dom.pnl.querySelector('.worth');
  if (!card) return;
  const shown = amountsIn(card.querySelector('.worth-value')?.textContent || '')[0];
  const withoutStock = Math.round((Number(state.cash) || 0)
    + (Number(state.assetValue) || 0) - (Number(state.debt) || 0));
  checkOnce(`wc-in-worth:${where.chapter}`,
    `${where.chapter}: what the panel says the business is worth counts the money in its stock`,
    shown === netWorth(state) && shown !== withoutStock,
    `panel says ${shown}; without the stock it would be ${withoutStock}, `
    + `and ${held} is held (${where.turn})`);
}

/**
 * The numeric prediction card restates the two figures the estimate is built from:
 * what the trade keeps, and what the week costs in rent, wages and fees. Same rule —
 * they have to be numbers this business actually produces.
 */
function auditPredictNumber(where) {
  const card = dom.decision.querySelector('.number-prediction');
  if (!card) return;
  const state = liveState();
  if (!state) return;

  const hints = card.querySelectorAll('.number-hint');
  if (hints.length < 2) return;
  // Read the amounts as a set rather than by position: which of "kept" and "fixed"
  // comes first is a property of the sentence, and the sentence differs by language.
  const stated = amountsIn(hints[1].textContent);
  if (!stated.length) return;

  const pnl = weeklyPnl(state);
  const contribution = pnl.perLine.reduce((total, line) => total + line.contribution, 0);
  const perUnit = pnl.unitsSold > 0 ? Math.round(contribution / pnl.unitsSold) : 0;
  // One product: what one sale keeps. A mix has no such number, so the card should be
  // quoting what the products together keep in a week.
  const expected = pnl.perLine.length > 1 ? contribution : perUnit;
  if (!expected) return;

  checkOnce(`predict-kept:${where.chapter}`,
    `${where.chapter}: the prediction card names a margin the business actually earns`,
    stated.some((amount) => Math.abs(amount - expected) <= 1),
    `it says ${stated.join(' and ')}; this week the trade keeps ${expected} (${where.turn})`);
}

/**
 * A stepper the learner cannot move, or that moves without saying so, is a
 * data-integrity bug and not a cosmetic one (D-015). Press every live-looking button
 * and insist the readout follows.
 */
function auditStepper(where, card) {
  const readout = card.querySelector('[data-role="value"]');
  const buttons = card.querySelectorAll('.stepper-button');
  if (!readout || buttons.length === 0) return;

  checkOnce(`stepper-buttons:${where.chapter}`,
    `${where.chapter}: a stepper offers fine and coarse steps in both directions`,
    buttons.length === 4, `got ${buttons.length} (${where.turn})`);

  let moved = 0;
  for (const button of buttons) {
    if (button.disabled) continue;
    const before = readout.textContent;
    button.click();
    if (readout.textContent !== before) moved += 1;
    else {
      checkOnce(`stepper-dead:${where.chapter}`,
        `${where.chapter}: an enabled stepper button changes the value`,
        false, `${button.dataset.step} did nothing at ${before} (${where.turn})`);
    }
  }
  checkOnce(`stepper-frozen:${where.chapter}`,
    `${where.chapter}: a stepper can be moved at all`,
    moved > 0, `nothing moved on ${where.turn}`);
}

// --- driving a turn ------------------------------------------------------

/** The buttons a learner could actually press right now. */
function liveButtons(container = dom.decision) {
  return container.all().filter((n) => n.tagName === 'BUTTON'
    && !n.disabled && (n.listeners.click || []).length > 0);
}

/**
 * One press, choosing the way a learner would: the control in front of them.
 * `variant` rotates the choice so a run does not always walk the same path.
 */
function advance(where, variant) {
  const decision = dom.decision;

  // Information first, where it is offered — it is part of the screen and its "used"
  // state has its own rendering path.
  const info = dom.info.querySelectorAll('.info-item').filter((b) => !b.disabled);
  if (info.length && variant % 3 === 0) { info[0].click(); return 'info'; }

  const diagnose = decision.querySelectorAll('.diagnose-option').filter((b) => !b.disabled);
  if (diagnose.length) { diagnose[variant % diagnose.length].click(); return 'diagnose'; }

  const numberCard = decision.querySelector('.number-decision');
  if (numberCard) {
    auditStepper(where, numberCard);
    const commit = numberCard.querySelector('[data-role="commit"]');
    check(`${where.chapter}: a number decision can be committed`, Boolean(commit) && !commit.disabled);
    commit.click();
    return 'number';
  }

  const allocCard = decision.querySelector('.allocation-decision');
  if (allocCard) {
    const commit = allocCard.querySelector('[data-role="commit"]');
    checkOnce(`alloc-commit:${where.chapter}`,
      `${where.chapter}: an allocation starts fully allocated, so it can be committed`,
      Boolean(commit) && !commit.disabled, where.turn);
    // Move some money, then put it back, so the "remaining" line and the disabled
    // commit are both exercised.
    const steppers = allocCard.querySelectorAll('.stepper-button');
    if (steppers.length > 4) {
      const firstValue = allocCard.querySelector('[data-role="value"]');
      const takeFromFirst = steppers.find((b) => b.dataset.step === '-1' && !b.disabled);
      if (takeFromFirst) {
        const before = firstValue.textContent;
        takeFromFirst.click();
        // A button that looks live and does nothing is its own defect; assert it here
        // rather than letting it masquerade as the commit staying enabled.
        checkOnce(`alloc-dead:${where.chapter}`,
          `${where.chapter}: an enabled allocation button changes the amount`,
          firstValue.textContent !== before,
          `pressing "-" at ${before} did nothing (${where.turn})`);
        checkOnce(`alloc-blocks:${where.chapter}`,
          `${where.chapter}: money left unallocated blocks the commit`,
          firstValue.textContent === before || commit.disabled === true,
          `commit stayed live with money unspent (${where.turn})`);
        const giveToSecond = allocCard.querySelectorAll('.allocation-bucket')[1]
          ?.querySelectorAll('.stepper-button').find((b) => b.dataset.step === '+1' && !b.disabled);
        if (giveToSecond) giveToSecond.click();
      }
    }
    if (commit.disabled) {
      // Put everything back in the first bucket rather than leaving the run stuck.
      const first = allocCard.querySelectorAll('.allocation-bucket')[0];
      for (let i = 0; i < 40 && commit.disabled; i += 1) {
        const up = first?.querySelectorAll('.stepper-button').find((b) => b.dataset.step === '+5' && !b.disabled)
          || first?.querySelectorAll('.stepper-button').find((b) => b.dataset.step === '+1' && !b.disabled);
        if (!up) break;
        up.click();
      }
    }
    checkOnce(`alloc-recoverable:${where.chapter}`,
      `${where.chapter}: an allocation can always be made to add up again`,
      !commit.disabled, `commit still blocked on ${where.turn}`);
    commit.click();
    return 'allocate';
  }

  const options = decision.querySelectorAll('.option').filter((b) => !b.disabled);
  if (options.length) { options[variant % options.length].click(); return 'choice'; }

  const predictNumber = decision.querySelector('.number-prediction');
  if (predictNumber) {
    auditPredictNumber(where);
    auditStepper(where, predictNumber);
    predictNumber.querySelector('[data-role="commit"]').click();
    return 'predict-number';
  }

  const predictChoices = decision.querySelectorAll('.predict-choice').filter((b) => !b.disabled);
  if (predictChoices.length) {
    predictChoices[variant % predictChoices.length].click();
    return 'predict';
  }

  // Work it out, reveal, and anything else that moves on with one button.
  const rest = liveButtons();
  if (rest.length === 1) { rest[0].click(); return 'continue'; }
  if (rest.length > 1) { rest[rest.length - 1].click(); return 'continue'; }
  return 'stuck';
}

// --- one chapter ---------------------------------------------------------

async function playChapter(chapterIndex, lang) {
  const chapter = manifest.chapters[chapterIndex];
  const scenario = scenarios.get(chapter.id);
  const where = { chapter: chapter.id, lang, turn: 't00' };
  console.log(`\n  ${chapter.id} — ${lang}`);

  const cards = dom.decision.querySelectorAll('.chapter-card');
  check(`${chapter.id}: the chapter list offers it`, Boolean(cards[chapterIndex]));
  cards[chapterIndex].click();
  await settle();

  check(`${chapter.id}: opening it renders a situation`, dom.situation.textContent.length > 40);
  check(`${chapter.id}: opening it renders the ledger`, dom.pnl.textContent.length > 0);

  // Play as a learner who wants to see the numbers. The money panel is collapsed until
  // asked for, and a ledger line only counts as introduced once it has been on an open
  // panel — so with it shut the explanations correctly wait rather than being spent.
  if (dom['pnl-toggle'].getAttribute('aria-expanded') !== 'true') {
    dom['pnl-toggle'].click();
    await settle();
  }
  check(`${chapter.id}: the money panel opens when asked for`,
    dom['pnl-wrap'].hasAttribute('hidden') === false);

  let lastProgress = -1;
  let steps = 0;
  let reachedEnd = false;
  const seenTurns = new Set();
  // Every ledger line that introduced itself, and the turn it did so on. A line must
  // explain itself once: never twice, and never not at all.
  const introduced = new Map();

  for (; steps < 400; steps += 1) {
    const saved = storeData.get('business-simulator:v1');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        where.turn = scenario?.turns?.[session.turnIndex]?.id || `#${session.turnIndex}`;
        seenTurns.add(session.turnIndex);
      } catch { /* mid-write */ }
    }

    auditScreen(where);
    auditWorkout(where);
    auditLedger(where);
    auditWorth(where);
    auditWorkingCapital(where);

    // Keyed on the progress bar rather than the saved turn id: a new session is not
    // written to storage until the learner acts, so on the first screen of a chapter
    // the save still describes the last one, and one turn would look like two.
    const turnNow = dom.progress.getAttribute('aria-valuenow');
    for (const line of dom.pnl.querySelectorAll('.pnl-new-line')) {
      const text = line.textContent;
      if (introduced.has(text) && introduced.get(text) !== turnNow) {
        checkOnce(`ledger-twice:${chapter.id}`,
          `${chapter.id}: a ledger line introduces itself once, not repeatedly`,
          false, `"${text.slice(0, 50)}" on turn ${introduced.get(text)} and again on turn ${turnNow}`);
      }
      if (!introduced.has(text)) introduced.set(text, turnNow);
    }

    // Progress never goes backwards inside a chapter.
    const now = Number(dom.progress.getAttribute('aria-valuenow'));
    if (Number.isFinite(now)) {
      checkOnce(`progress-back:${chapter.id}`,
        `${chapter.id}: progress never goes backwards`,
        now >= lastProgress, `${lastProgress} then ${now} (${where.turn})`);
      lastProgress = now;
    }

    if (dom.decision.querySelectorAll('.recap-item').length > 0) { reachedEnd = true; break; }

    const live = liveButtons();
    if (live.length === 0) {
      check(`${chapter.id}: every screen offers a way forward`, false,
        `nothing to press on ${where.turn}`);
      break;
    }

    const outcome = advance(where, steps + chapterIndex);
    if (outcome === 'stuck') {
      check(`${chapter.id}: every screen offers a way forward`, false, `stuck on ${where.turn}`);
      break;
    }
    await settle();
  }

  check(`${chapter.id}: the chapter can be played to the end`, reachedEnd,
    `gave up after ${steps} presses on ${where.turn}`);

  // Chapter 1 runs on the five lines every business has, so it may introduce nothing.
  // Every later chapter is built on lines a mandazi stall does not have, and a learner
  // who is never told what they are is reading a ledger they cannot read.
  if (chapterIndex > 0) {
    check(`${chapter.id}: the ledger lines a stall does not have introduce themselves`,
      introduced.size > 0, 'no ledger line explained itself in the whole chapter');
  } else {
    // Chapter 1 gained working capital (session 018) and must not have gained a row
    // with it: the weekly ledger has no line for money tied up in stock, because it is
    // not a cost. Two things explain themselves here and no more — spoilage, when the
    // stall first throws food away, and what the business is worth. A third arrival
    // means a row appeared that D-025 has not been given a sentence for.
    check(`${chapter.id}: working capital brought no unexplained row with it`,
      introduced.size === 2,
      `${introduced.size} line(s) explained themselves: ${[...introduced.keys()]
        .map((text) => `"${text.slice(0, 40)}"`).join(', ')}`);
  }
  if (verbose) console.log(`    (${introduced.size} ledger line(s) introduced)`);

  if (reachedEnd) {
    // Recovery turns are spliced into the list when cash goes below zero, so a run that
    // needed one recaps more concepts than the file holds. Never fewer.
    const recap = dom.decision.querySelectorAll('.recap-item');
    check(`${chapter.id}: the end recaps every concept it taught`,
      recap.length >= scenario.turns.length,
      `${recap.length} of ${scenario.turns.length}`);
    check(`${chapter.id}: every authored turn was played, none skipped`,
      seenTurns.size >= scenario.turns.length,
      `saw ${seenTurns.size} of ${scenario.turns.length}`);
    auditScreen({ ...where, turn: 'end' });
  }

  // Back to the list the way a learner would.
  dom.chapters.click();
  await settle();
  check(`${chapter.id}: the chapter list is reachable afterwards`,
    dom.decision.querySelectorAll('.chapter-card').length === manifest.chapters.length);
}

// --- the run -------------------------------------------------------------

console.log('playthrough: every chapter, every turn, both languages');

for (const lang of ['en', 'sw']) {
  const button = dom.lang.querySelectorAll('button').find((b) => b.dataset.lang === lang);
  check(`the ${lang} language button exists`, Boolean(button));
  button.click();
  await settle();

  for (let i = 0; i < manifest.chapters.length; i += 1) {
    if (!scenarios.get(manifest.chapters[i].id)) continue;   // listed, not yet authored
    await playChapter(i, lang);
  }
}

// Without this the two working-capital checks above would pass in the happiest possible
// way: by never having been reached. Chapter 1 is the one that matters — it is the only
// chapter most players will ever finish, and until session 018 it had no working capital
// in it at all.
check('chapter 1 actually meets money tied up in stock while it is played',
  chaptersWithStock.has('mama-asha'),
  `only met in: ${[...chaptersWithStock].join(', ') || 'no chapter'}`);

// --- leaving a chapter and coming back -----------------------------------

console.log('\n  leaving a chapter part-way and coming back');
{
  dom.decision.querySelectorAll('.chapter-card')[0].click();
  await settle();

  for (let i = 0; i < 12; i += 1) { advance({ chapter: 'resume', lang: 'en', turn: '?' }, i); await settle(); }
  // Read the screen, not the save. A new session is not written to storage until the
  // learner does something, so asking storage here would report the run that had just
  // been thrown away and pass whatever happened.
  const reached = Number(dom.progress.getAttribute('aria-valuenow'));
  check('a few turns were actually played', reached > 0, `on turn ${reached + 1}`);

  dom.chapters.click();
  await settle();
  dom.decision.querySelectorAll('.chapter-card')[0].click();
  await settle();

  const now = Number(dom.progress.getAttribute('aria-valuenow'));
  check('coming back to a chapter resumes where the learner stopped',
    now === reached, `left on turn ${reached + 1}, came back to turn ${now + 1}`);

  dom.chapters.click();
  await settle();
}

// --- the unverified banner -----------------------------------------------

console.log('\n  the placeholder-figures banner');
{
  const unverifiedIndex = manifest.chapters
    .findIndex((c) => scenarios.get(c.id) && scenarios.get(c.id).unverified);
  const verifiedIndex = manifest.chapters
    .findIndex((c) => scenarios.get(c.id) && !scenarios.get(c.id).unverified);

  if (unverifiedIndex >= 0 && verifiedIndex >= 0) {
    dom.decision.querySelectorAll('.chapter-card')[unverifiedIndex].click();
    await settle();
    check('a chapter with unchecked figures says so', dom.banner.hidden === false);

    dom.chapters.click();
    await settle();
    dom.decision.querySelectorAll('.chapter-card')[verifiedIndex].click();
    await settle();
    check('and a chapter whose figures were checked does not',
      dom.banner.hidden === true, `banner still reads "${dom.banner.textContent.slice(0, 60)}"`);
    dom.chapters.click();
    await settle();
  }
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length === 0 ? 0 : 1);
