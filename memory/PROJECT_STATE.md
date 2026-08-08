# Project state

**Snapshot as of:** 2026-08-08
**Last session:** [`sessions/2026-08-08-012-playing-it-and-what-that-found.md`](./sessions/2026-08-08-012-playing-it-and-what-that-found.md)

> This file is a **snapshot, not a history**. Overwrite it at the end of every session
> so it always describes the present. History belongs in `sessions/` and
> `DECISIONS.md`.

---

## Where we are

**All four chapters are written and playable, and nobody outside this repository has played
any of them.** That sentence is the whole state of the project.

The stall, the bakery, the factory and the export business are twenty turns each, in English
and Kiswahili, each graded against its own prediction bands. Six checks are green. Chapters 3
and 4 carry `unverified: true`, which puts a banner on screen, because their opening balance
sheets and their payroll, duty and freight figures have not been seen by anyone with local
ground truth.

The bottleneck has moved. For eight sessions it was content; the arc was designed before it
was written. It is now **contact with real people** — an owner playing it, a first-language
Kiswahili reader, a phone, and Tanzanian figures somebody can vouch for. None of those can be
produced from inside this repository.

Twelve sessions: repository bootstrap (001), an ideation discussion on pedagogy and placement
(002), the first build (003), a shareable single-file version (004), a rework for depth and
Kiswahili (005), free-input decisions plus a campaign (006), a repair of two controls that
could not reach their own answers (007), the four-chapter arc and the engine to carry it
(008), an audit and a file with two owners (009), the bakery landing plus the service worker
(010), chapters 3 and 4 plus the anchor bug (011), and a playthrough check plus the six
defects it found (012).

**Sessions 006, 007, 011 and 012 all exist because somebody played it.** Four of the twelve.
Every one of them found defects that the whole test suite had passed clean, and every one of
them was a control lying to the learner rather than an engine getting a number wrong. Session
012 finally turned that into a check — `playthrough.mjs` — but the pattern is old enough now
to be a fact about this project: **the model is well tested and the screens are where the
defects live.**

The project rests on the owner's background note
([`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md)) —
read it before anything else. The arc is in [`docs/arc.md`](../docs/arc.md) and
[ADR-0007](../docs/adr/0007-four-chapter-arc.md).

## What exists

| Area | State |
|---|---|
| **Chapter 1 — the stall** | **Playable**, and the only chapter the owner has played. 20 turns. |
| **Chapter 2 — the bakery** | **Playable.** Own band edges (D-018), chosen from its own option deltas. |
| **Chapter 3 — the factory** | **Playable.** `unverified: true` — figures not locally checked. |
| **Chapter 4 — the export business** | **Playable.** `unverified: true`. Possibly too easy — Q-023. |
| **The engine** | Product mix, depreciation, debt, working capital, FX, landed cost, and `readField` (D-021). Chapter 1's behaviour asserted unchanged throughout. |
| **The chapter layer** | Manifest, select screen, `carry.js`, per-chapter save. Nothing locked, nothing summed. |
| **Offline** | `sw.js` — shell cache-first, content network-first with a cache fallback, `build-info.json` exempt. **Never tested on a device.** |
| Operating guide (`AGENTS.md`, `CLAUDE.md`) | Written. Carries the thesis and memory protocol. |
| Memory system | In use — this file, 25 decisions, 26 open questions (2 resolved), glossary, 12 session entries, 3 contracts. |
| Governance, licences | Written. MIT code + CC BY-SA 4.0 content. |
| Design docs (`docs/`) | `arc.md` is current. `game-design.md`, `curriculum.md` and `assessment.md` are **behind the code**. |
| Regional context (`docs/context/`) | Owner's note in place. Country detail still a **deliberate stub**. |
| ADRs | Seven, all `Accepted`. |
| Tests | 7 checks, all green. See below. |
| Curriculum content | Four chapters. Far-transfer testing is now *possible* and still not implemented. |
| Partners, pilot sites, funding | Still not recorded. See Q-002. |

**What green means, as of this snapshot:**

| Check | Result |
|---|---|
| `test-engine.mjs` | 226 passed |
| `validate-scenario.mjs` | 177/177 option predictions, 75/75 numeric turn paths, 0 problems, 4 chapters |
| `validate-i18n.mjs` | 1,789 content strings × 2 languages; 109 literal + 7 built interface keys |
| `simulate-runs.mjs` | no whole-business failures; `attentive` finishes all four chapters |
| `smoke-app.mjs` | 29 passed |
| **`playthrough.mjs`** | **1,372 passed** — 4 chapters × 2 languages, every turn, every screen |
| `check-links.sh` | 321 relative links resolve |

`validate-scenario.mjs` also prints `drift` lines from a 400-path random sweep. **Those are
real findings that deliberately do not fail** — chapters 1, 2 and 3 have unstable options.
See Q-022 before dismissing them.

`playthrough.mjs` is the only check that reads a screen and asks whether what it says is
true. The other six test the model. **Six of the six defects found in session 012 were
invisible to all of them**, and every one was something a person would meet in the first five
minutes: a crash on the language button, a work-it-out card pricing a bakery's bread at the
mandazi stall's 500 shillings, a diagnose control showing raw keys with "TZS 0" beside them,
the end-of-chapter record printing `indicator.diagnosis` as text, and a chapter list that
threw a part-played run away.

## How to run it

**Locally:**

```bash
cd app && python3 -m http.server 8000
```

Then open `http://localhost:8000`. It needs a server — `file://` will not work for
`index.html`, because the browser refuses to fetch the content JSON. (`standalone.html`
does work from `file://`.) See [`../app/README.md`](../app/README.md).

**Hosted:** **https://arnoroh.github.io/business_simulator/** — public, deployed by
`.github/workflows/pages.yml`, which uploads `app/` on every push to `main` that touches it.
The app is served at the site root and **tracks `main` automatically**; there is no
republish step and no second copy of the app anywhere.

**Verify a deploy by its commit, not its content:**

```bash
curl -s https://arnoroh.github.io/business_simulator/build-info.json   # compare to git rev-parse HEAD
```

That check exists because content alone once failed to catch a broken deploy — the previous
build carried the same scenario, so fetching the JSON back "passed" while the deployment had
actually failed.

Three hosting approaches failed before this one, and all three are recorded in the workflow
so they are not retried:

1. A hand-built `gh-pages` branch. Tracked nothing, needed manual republishing, and once
   published a build two versions old while reporting success. Branch now deleted.
2. Pages serving the `main` root through the legacy Jekyll builder — failed outright on a
   repository root carrying docs, memory and licences.
3. The workflow with `cancel-in-progress: true` on the pages concurrency group, which
   cancels the *deployment* rather than a superseded run. It must stay `false`.

The session 004 claude.ai artifact link is abandoned and stale.

## Decisions locked in

1. The simulator is a **selection instrument, not a business-plan generator** (ADR-0004).
   The defining decision.
2. **Mobile-first, offline-capable PWA** (ADR-0002) — now behaviour, not just a claim.
3. **MIT** code, **CC BY-SA 4.0** content (ADR-0003).
4. **Tanzania first** (D-005).
5. **Vanilla ES modules, no build step, no dependencies** (ADR-0006).
6. **Stage-zero placement, with completion as the gate** (ADR-0005; D-008). Finishing is what
   carries a learner forward — never how many predictions they got right.
7. **Bilingual content inline and key-major**, parity enforced by a check (D-009).
8. **Mean-reverting demand, hygiene floor** (D-010) and **insolvency sheds what cannot be
   funded** (D-014).
9. **The learner supplies numbers where a number is the decision** (D-011), with content
   declaring response curves rather than formulas.
10. **Numeric predictions graded close / near / off** (D-012).
11. **A goal spans the run and is reported, never scored** (D-013).
12. **Every control must be able to reach the answer** (D-015), and **anchor on a value that
    actually exists, proven by a check** (D-021).
13. **Four chapters, bounded starts, six carried flags** (ADR-0007, D-016). Self-contained,
    playable in any order, nothing locked, nothing summed. The arc is **not a ladder** — a
    stall run well is a real business.
14. **Advanced concepts go in the engine, not in new controls** (D-017).
15. **Prediction band edges are per chapter** (D-018), each chosen to land in a *gap* between
    clusters of outcomes.
16. **A chapter must be finishable by a learner who reads the warnings** (D-019) — the
    `attentive` player failing is a FAIL, not a warning.
17. **The end of a chapter recaps the concepts, not the performance** (D-020).
18. **An effect that must survive every path moves the whole constraint, and is signed**
    (D-022).
19. **Every figure on screen is one the business actually has, and every column adds up**
    (D-023), enforced by `playthrough.mjs`.
20. **A diagnose step reads three kinds of evidence** — P&L rows, the cash statement, and
    authored evidence with no figure at all (D-024).
21. **A ledger line a stall does not have introduces itself, once** (D-025), and only on a
    panel the learner has open.

## What the app now does that the docs do not describe

- **Free-input decisions** — turns that take a number on a stepper, with live feedback, now
  including a price on a single product line. One turn splits profit between business, home
  and reserve.
- **Diagnose** — read the ledger and name the line that caused a loss.
- **Numeric prediction**, graded close / near / off, on a stepper sized to hold every outcome
  the decision could produce (D-015).
- **A goal across the run**, plus **recovery chapters** when cash goes below zero.
- **Predict-then-reveal**, each band labelled with the money it covers.
- **Work it out** — the arithmetic of the current position, opt-in per turn and automatic
  wherever the prediction is a number.
- **A chapter select** — four chapters, none locked, none scored.
- **A concept recap at the end of a chapter**, with the learner's decision against each and
  no marks (D-020).
- **Profit and cash shown as different numbers** whenever they differ, with a line saying why.
- **Per-product contribution margin**, once a business sells more than one thing.
- **Before/after ledger** on every reveal, changed line highlighted.
- **Delayed consequences** that attribute themselves to the earlier decision.
- **Owner time as a real constraint** — scales with output, falls with staff, degrades quality
  when exceeded.
- **Working capital and a cash conversion cycle** the learner can see move.
- **Each new ledger line explaining itself**, once, the first time it appears — 1 line in
  chapter 1, 3 in chapter 2, 3 in chapter 3, 5 in chapter 4 (D-025).
- **A work-it-out card that adds up**, showing one row per product where there is a mix.
- **Trajectory projection** twelve weeks ahead.
- **Three-layer record** — observations, indicators with evidence, hedged profile. No score,
  no rank, no percentile, enforced by tests.
- **Offline play** after first load, via `sw.js`.

Still unimplemented: far-transfer testing, pre/post, delayed retest. All four chapters now
exist, so none of them is blocked on content any more.

## What is not decided

Blocking, in priority order — full list in [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md):

- **Q-002** — Which programme this feeds, and whether any partner runs a staged portfolio.
  The top blocker: ADR-0005 is accepted, and a stage-zero gate only exists if there is a
  stage 1 to gate into.
- **Q-001** — Primary learner segment.
- **Q-015** — Is the Kiswahili register right? Needs a first-language speaker; there are now
  four chapters of it, and the app says so on screen until it is checked.
- **Q-018** — Are the chapter 2–4 opening states and figures realistic for Tanzania? Chapters
  3 and 4 ship `unverified: true` for exactly this reason.
- **Q-022** — Should the 400-path stability sweep fail rather than report? Owner's call,
  because making it fail turns three of four chapters red.
- **Q-023** — Is chapter 4 now too easy?
- **Q-026** — Mechanical depth peaks in chapter 2 (26 engine fields, against 14 / 21 / 18),
  and every structural measure is identical across all four chapters. The arc is a cliff and
  then a plateau. Intended, or does it need restructuring? The owner's call.
- **Q-025** — Chapter 4 now opens with five ledger lines explaining themselves at once.
- **Q-004 / Q-013** — Playthrough length; whether 20 deeper turns is right.

## Immediate next steps

1. **The owner plays it.** Chapter 1 first, in both languages — sessions 008, 010 and 011 all
   changed the turn loop since it was last played, and playing is what found the defects in
   006 and 007. Then chapter 4, which Q-023 is about.
2. **Look at it on a phone**, and play a chapter with the connection turned off. Nobody has
   done either. There is no browser in the working environment; `smoke-app.mjs` verifies the
   wiring headlessly and can say nothing about layout.
3. **Get the Kiswahili reviewed** (Q-015).
4. **Verify the Tanzanian figures** in chapters 3 and 4 (Q-018), so `unverified` can come off
   and the banner can come down.
5. **Rule on Q-022 and Q-021**, which together decide whether the stability sweep becomes a
   FAIL and whether chapter 1 gets rebalanced.
6. Fix bakery t16, where all three options declare the same prediction (Q-024) — small, and
   worth doing when that file is next open.
7. Reconcile `docs/` with the code: `game-design.md`, `curriculum.md`, `assessment.md`.

## Notes for whoever picks this up next

- Read `AGENTS.md` §2 first. A business-plan builder, pitch scoring and personality
  assessment are all ruled out by the thesis and will look like obvious wins.
- **Run all seven checks after any content edit**, and `validate-i18n.mjs` after touching any
  string. Every new UI string needs both languages in `app/content/ui.json`.
- **If you change anything a learner looks at, run `playthrough.mjs` and add an assertion to
  it.** The model is well tested; the screens are where the defects live, four sessions
  running. `-v` prints every assertion and how many ledger lines each chapter introduces.
- **A card may only state a figure the business actually produces** (D-023). `state.price`
  and `state.unitCost` are not that figure in a chapter with `lines` — they sit at the
  engine's defaults of 500 and 300 and always will, because the engine has no use for them
  there. Read `weeklyPnl(state).perLine`.
- **The stub DOM is shared**, in `scripts/lib/stub-dom.mjs`. Add missing DOM methods there
  once, rather than in a harness.
- **Read the output, do not just check the exit code.** `simulate-runs.mjs` prints numbers a
  person is meant to read (D-019), and `validate-scenario.mjs` prints `drift` lines that are
  real findings which deliberately do not fail (Q-022). Both have caught what a green exit
  hid.
- **`readField(state, field)` is the only correct way to read a state field by its authored
  name.** A plain index silently returns `undefined` for `lines.<id>.<field>`, which becomes
  0 through `Number(x) || 0` — a control that lies about where the learner is. That defect
  cost a learner 34–50 reputation for naming any export price at all, and it was recorded as
  their judgement (D-021).
- **Author signed deltas** (`"+60"`, `"-0.045"`) for any field an earlier turn can also move;
  an unsigned number is an absolute set. And an option that changes the order book moves
  `demand` and `capacity` together (D-022).
- **`spoilRate` charges unsold capacity only** — not transit damage, not anything that
  happens to goods that ship.
- **`cash += cashFlow` is the line to be careful around** (D-017). Put anything that moves
  cash in `weeklyCashFlow` and keep the assertion that chapter 1's twenty-week cash total is
  unchanged — the cheapest protection in `test-engine.mjs`.
- **Working capital is held in state (`wcHeld`), not derived per week.** Deriving a change
  from a single state catches drift and misses every swing the learner caused.
- **Band edges are not free choices.** Each chapter's were picked to fall in a gap between
  clusters of outcomes (D-018). Rounding them off makes options unstable.
- **The six carry flags are a closed set on purpose.** A seventh needs a `DECISIONS.md` entry
  (ADR-0007 "revisit if"). Needing one twice means the abstraction is wrong.
- **`chapters.json` listing a chapter with no file is a supported state**, not a bug — though
  as of now every listed chapter has one.
- **Adding a decision type** touches four places: the engine resolver, the renderer, the phase
  machine in `main.js`, and the validator.
- **A control the learner cannot move, cannot answer with, or that measures from the wrong
  place is a data-integrity bug**, not a cosmetic one. Sessions 007 and 011 both shipped one,
  and both times the record scored it as the learner's miss. The general lesson: the checks
  test the model and say almost nothing about the controls, so each control defect has to be
  turned into a check of its own or it will not be found.
- **Rebuild `standalone.html`** (`node scripts/build-single-file.mjs`) after any change under
  `app/`. It went a whole chapter stale between sessions 008 and 011 and nothing noticed.
- **Content edited by more than one agent needs a written contract first**, in
  `memory/contracts/`. Session 009 is what happens without one; session 011's split worked
  because the two chapters shared no state at all.
- **Verify a deploy by reading back `build-info.json`.** Republishing once pushed the old
  build and reported success.
- The owner runs Upendo Honey / Third Man Ltd, Tanganyika Blue and Dark Earth Carbon in
  Tanzania — the available sources of ground truth, and the likely route to a Kiswahili
  reviewer.
