# Session 012 — playing every chapter, and the six things that found

**Date:** 2026-08-08
**Worked by:** Claude (Opus 5)
**Branch:** `chapters-3-4-and-balance`
**Duration / scope:** Large. A seventh check, six defects, three decisions, one new teaching
mechanism.

---

## Goal

The owner's request, as made: *"Can you please go through the game play and make judgement
calls on what makes a good experience whilst at the same time giving strong educational
lessons. Progressively more in depth as the chapters go. Also run additional tests on
playability, bugs, etc. The last times I played through for v2 there were bugs straight away
on the ui."*

Two jobs: find the defects a playthrough finds, and exercise judgement about the experience
and its teaching.

## What happened

### The check that was missing

`smoke-app.mjs` drives the real app, and checks the wiring at about eight chosen points: the
select screen renders, one turn of chapter 1 advances, the end screen recaps. Everything else
in the suite tests the **model** — the engine, the content, the two against each other.
Nothing had ever read a screen and asked whether what it said was true. That is precisely the
gap the owner kept falling into.

`scripts/playthrough.mjs` opens every chapter, presses every control to the end, in English
and in Kiswahili, and audits every screen on the way: no broken value, no unfilled
placeholder, no untranslated key, no dead button, no screen without a way forward, every
stepper actually moves, every column of figures adds up to the total under it. The stub DOM
came out of `smoke-app.mjs` into `scripts/lib/stub-dom.mjs` so there is one of them, not two.

It found six live defects on the first run.

### What it found

1. **The language toggle threw on the chapter select** — the first screen a learner sees. The
   handler called `renderAll()`, which reads `scenario.turns`, and there is no scenario on
   that screen. So tapping "Kiswahili" before choosing a chapter left the chapter list in
   English with an exception in the console. The most visible possible place for it to be.

2. **Every work-it-out card in chapters 2, 3 and 4 priced the goods wrong.** `createState`
   leaves the flat `price` and `unitCost` at the engine's defaults when a chapter authors
   product lines, because nothing in the *engine* reads them — but the interface did. The card
   said "You sell 1,240 at TZS 500 each, they cost you TZS 300 each" over a revenue figure
   computed from bread at 1,200 and cake at 12,000. A learner doing the arithmetic the card
   asks for gets a number that is not on the card. The numeric prediction card repeated it:
   "You keep TZS 200 on each sale", in a bakery. ([D-023](../DECISIONS.md))

3. **The workout column did not add up, in any chapter.** Spoilage, freight, duty and
   currency were charged by the engine and left out of the card, while the total underneath
   was the real profit. Chapter 1 had this too, whenever spoilage was non-zero.

4. **The diagnose control was broken in three of the four chapters.** It assumed every option
   was a P&L row. The bakery and the export chapter ask which line explains why profit did not
   reach the bank — cash questions — and the factory asks which step of the floor caps output,
   which has no figure at all. Anything the lookup missed rendered as the **raw key with "TZS
   0" beside it**: `cash.workingCapitalChange`, `mixing`, `wheat-price`, on screen in those
   words. In two of the three, that included the correct answer. ([D-024](../DECISIONS.md))

5. **Four profile strings were missing**, so the end-of-chapter record — the artefact a
   programme is supposed to read — showed `indicator.diagnosis` and `profile.stmt.goal` as
   literal text, in every chapter, in both languages. `validate-i18n.mjs` did not catch them
   because `record.js` carries them as *data* (`indicatorKey:`, `key:`) and the scanner looks
   for `t('literal')` in code.

6. **Leaving a chapter threw the run away.** The chapter list passed `forceNew: true`
   unconditionally, so tapping "Choose chapter" and tapping the same chapter back started it
   from turn 1. Fifteen turns of the bakery, gone, no warning. The comment in `main.js`
   describing the intended behaviour — resume the same chapter, start a different one — had
   been right and untrue since the screen was written.

Two smaller ones fell out of the same pass: the allocation stepper never disabled its buttons,
so at zero a learner pressed a live-looking control and nothing happened (the number stepper
has done this since it was written, with a comment saying why); and chapter 4 authors
`valueAs: "currency"`, which `decisionValue` did not recognise, so its price steppers showed
"1,700" while the next screen showed "TZS 1,700" for the same number.

### The judgement calls

**The arithmetic on screen has to be arithmetic that works.** That is the rule the workout
fix comes from, and it decided the shape: a single-product business still sees "sell N at the
price, they cost this each"; a business with a mix sees **one row per product** — units sold
times what each one keeps — then spoilage, freight, duty and currency where they are live,
then fixed costs, then the profit. It adds up by construction, and "which product actually
earns" is the thing chapter 2 exists to teach. Depth arrived by making the card honest, not
by adding anything.

**A ledger line the learner has never met should say what it is.** `arc.md` §3 is explicit
that the advanced concepts are taught "by cash and profit visibly diverging in the panel the
learner already reads, not by a working-capital slider" — and then a depreciation row simply
appeared, in a chapter where nothing on screen used the word. Now any line beyond the five
every business here has introduces itself in one sentence, once, and only once the learner has
the panel open ([D-025](../DECISIONS.md)). It produces 1 explanation in chapter 1, 3 in
chapter 2, 3 in chapter 3 and 5 in chapter 4 — the first mechanism in the app whose depth
scales with the arc instead of being flat across it.

**A number needs a noun.** The bakery's capacity turn read "You chose: -150". Number inputs
now carry an authored `unit`, so it reads "-150 items a week" on the stepper, on the
work-it-out card and in the record.

**What was not done, deliberately.** The content was not rebalanced. Counting the engine
fields each chapter actually moves gives 14, **26**, 21, 18 — chapter 2 introduces twelve new
fields at once and is mechanically heavier than either chapter after it, while every
structural measure (20 turns, 15 choices, 4 numbers, 1 allocation) is identical in all four.
The arc is a cliff and then a plateau. That may be exactly right — `arc.md` §1 progresses by
*what kind of thing you are running*, and the profit-versus-cash cluster does belong in the
bakery — but it is the owner's call, not an integrator's, so it is written up as
[Q-026](../OPEN_QUESTIONS.md) with the numbers rather than acted on.

## Decisions made

- **[D-023](../DECISIONS.md)** — every figure on screen is one the business has, and every
  column adds up; a playthrough check enforces it.
- **[D-024](../DECISIONS.md)** — a diagnose step reads three kinds of evidence, and evidence
  with no figure says so rather than showing a zero.
- **[D-025](../DECISIONS.md)** — a ledger line a stall does not have introduces itself, once.

## Questions raised or resolved

- **Raised: [Q-025](../OPEN_QUESTIONS.md)** — chapter 4 opens with five ledger lines
  explaining themselves at once. Too much on a phone? Needs a phone to answer.
- **Raised: [Q-026](../OPEN_QUESTIONS.md)** — mechanical depth peaks in chapter 2, not
  chapter 4. Is that the intended shape of the arc?

## State at end of session

Seven checks, all green, and the seventh is the one that reads screens:

| Check | Result |
|---|---|
| `test-engine.mjs` | 226 passed |
| `validate-scenario.mjs` | 177/177 option predictions, 75/75 numeric paths, 0 problems |
| `validate-i18n.mjs` | 1,789 content strings × 2 languages |
| `simulate-runs.mjs` | no whole-business failures; `attentive` finishes every chapter |
| `smoke-app.mjs` | 29 passed |
| `playthrough.mjs` | **1,372 passed**, 4 chapters × 2 languages |
| `check-links.sh` | 321 links resolve |

Nothing is half-finished. The content was not touched except to give the factory's two
diagnose steps real labels, to correct one wrong ledger key in the bakery, and to add units to
seven number inputs.

## Next steps

1. **The owner plays it** — that was the point. Chapter 1 in both languages, then chapter 4,
   which Q-023 and Q-025 are both about.
2. **On a phone.** Still nobody. Seven checks and not one of them can see a tap target.
3. **Rule on Q-026** — whether the arc's shape needs changing, now that the numbers are
   written down.
4. Q-022 (make the stability sweep a FAIL), Q-015 (Kiswahili review), Q-018 (Tanzanian
   figures) all still stand from session 011.

## Notes for the next contributor

- **`playthrough.mjs` is where a UI defect gets caught.** If you fix one, add the assertion
  there. Six of the six found in this session were invisible to every other check in the
  repository, and all six were things a person would have hit in the first five minutes.
- **The stub DOM lives in `scripts/lib/stub-dom.mjs` now** and is shared. If a render function
  starts using a DOM method the stub lacks, add it there once.
- **A card may only state a figure the business actually produces** (D-023). `state.price` and
  `state.unitCost` are *not* that figure in a chapter with `lines` — they sit at the engine's
  defaults of 500 and 300 and always will, because the engine has no use for them there. Read
  `weeklyPnl(state).perLine`.
- **`valueAs` on a number input: `count` is the exception, money is the default.** Chapter 4
  authors `"currency"` and three chapters author `"money"`; both must format as money.
- **Adding a ledger row means adding its `pnl.new.*` explanation**, or a learner meets it with
  no idea what it is. `LEDGER_BASICS` in `ui.js` is the list that does not need one.
- The `-v` flag on `playthrough.mjs` prints every assertion and the count of ledger lines each
  chapter introduces. That count is the cheapest read on whether the arc still deepens.
