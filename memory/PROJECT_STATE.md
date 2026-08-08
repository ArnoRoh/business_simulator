# Project state

**Snapshot as of:** 2026-08-08
**Last session:** [`sessions/2026-08-08-008-four-chapter-arc-engine.md`](./sessions/2026-08-08-008-four-chapter-arc-engine.md)

> This file is a **snapshot, not a history**. Overwrite it at the end of every session
> so it always describes the present. History belongs in `sessions/` and
> `DECISIONS.md`.

---

## Where we are

**The simulator is now a four-chapter arc, and three of the four chapters have no content
in them yet.** That sentence is the whole state of the project.

Chapter 1 — the mandazi stall, 20 turns, English and Kiswahili — is playable and unchanged
in behaviour. Chapters 2, 3 and 4 (bakery, factory, export) are **fully designed and
fully unwritten**: the concepts, the engine mechanics, the opening balance sheets, the
validators and the authoring contract all exist; the 60 turns of content do not.

Session 008 built everything the content needs and none of the content. Three authoring
agents were briefed and all three died on an API quota before writing a line. Nothing is
half-finished — there are no stub files, and the app handles a chapter that is listed but
not authored by saying so.

Eight sessions: repository bootstrap (001), an ideation discussion on pedagogy and
placement (002), the first build (003), a shareable single-file version (004), a rework
for depth and Kiswahili (005), free-input decisions plus a campaign (006), a repair of two
controls that could not reach their own answers (007), and the four-chapter arc plus the
engine to carry it (008). Two of those — 006 and 007 — happened because the owner played
the thing and found what no check could see.

The project rests on the owner's background note
([`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md)) —
read it before anything else. The arc is in
[`docs/arc.md`](../docs/arc.md) and [ADR-0007](../docs/adr/0007-four-chapter-arc.md).

## What exists

| Area | State |
|---|---|
| **Chapter 1 — the stall** | **Playable.** 20 turns, English + Kiswahili, goal + recovery chapters. |
| **Chapters 2–4** | **Designed, not written.** `docs/arc.md` has all 60 concepts; the contract has the opening states. No scenario files. |
| **The engine** | Extended for product mix, depreciation, debt, working capital, FX and landed cost. Chapter 1 unaffected, asserted. |
| **The chapter layer** | Manifest, select screen, `carry.js`, per-chapter save. Working and smoke-tested. |
| Operating guide (`AGENTS.md`, `CLAUDE.md`) | Written. Carries the thesis and memory protocol. |
| Memory system | In use — this file, 17 decisions, 16 open questions (2 resolved), glossary, 8 session entries, 2 contracts. |
| Governance, licences | Written. MIT code + CC BY-SA 4.0 content. |
| Design docs (`docs/`) | `arc.md` is current. The rest is first draft and **still well behind the code**. |
| Regional context (`docs/context/`) | Owner's note in place. Country detail still a **deliberate stub**. |
| ADRs | Seven, all `Accepted`. |
| Tests | 6 checks, all green: engine (211), scenario, i18n, links, **simulate-runs**, **smoke-app** (17). |
| Curriculum content | One chapter. Transfer testing still blocked on a second. |
| Partners, pilot sites, funding | Still not recorded. See Q-002. |

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
2. **Mobile-first, offline-capable PWA** (ADR-0002).
3. **MIT** code, **CC BY-SA 4.0** content (ADR-0003).
4. **Tanzania first** (D-005).
5. **Vanilla ES modules, no build step, no dependencies** (ADR-0006).
6. **Stage-zero placement, with completion as the gate** (ADR-0005, now `Accepted`; D-008).
   Finishing is what carries a learner forward — never how many predictions they got right.
7. **Bilingual content inline and key-major**, parity enforced by a check (D-009).
8. **Mean-reverting demand, hygiene floor** (D-010) and **insolvency sheds what cannot be
   funded** (D-014) — the business degrades, but cannot be driven to a dead state it can
   never leave, and costs cannot compound without bound.
9. **The learner supplies numbers where a number is the decision** (D-011), with content
   declaring response curves rather than formulas.
10. **Numeric predictions graded close / near / off** (D-012).
11. **A goal spans the run and is reported, never scored** (D-013).
12. **Every control must be able to reach the answer** (D-015) — a numeric input includes
    where the learner already is, and a prediction stepper covers every outcome the decision
    could produce.
13. **Four chapters, bounded starts, six carried flags** (ADR-0007, D-016). Each chapter is
    self-contained and playable alone, in any order. Nothing is locked, nothing is summed,
    and the arc is explicitly **not a ladder** — a stall run well is a real business.
14. **Advanced concepts go in the engine, not in new controls** (D-017). No new decision
    types; depth arrives as lines in the ledger the learner already reads.

## What the app now does that the docs do not describe

- **Free-input decisions** — six turns take a number the learner sets on a stepper, with
  live feedback ("you keep TZS 200 on each one; about 180 sales a week, so TZS 36,000 before rent and wages"). One turn
  splits profit between business, home and reserve.
- **Diagnose** — read the ledger and name the line that caused a loss.
- **Numeric prediction** — name a profit figure, graded close / near / off, on a stepper sized to hold every outcome the decision could produce (D-015).
- **A goal across the run**, plus **recovery chapters** when cash goes below zero.
- **Predict-then-reveal**, with each band labelled with the money it covers.
- **Work it out** — the arithmetic of the current position, shown before predicting. **Now
  opt-in per turn** (D-017), and automatic wherever the prediction is a number.
- **A chapter select** — four chapters, none locked, none scored.
- **Profit and cash shown as different numbers** whenever they differ, with a line saying
  why. This is what chapters 2–4 are built on.
- **Per-product contribution margin** in the money panel, once a business sells more than
  one thing.
- **Before/after ledger** on every reveal, with the changed line highlighted, and a note
  naming the line that moved when a prediction was wrong.
- **Delayed consequences** that attribute themselves to the earlier decision.
- **Owner time as a real constraint** — it scales with output, falls with staff, and
  degrades quality when exceeded.
- **Trajectory projection** twelve weeks ahead.
- **Three-layer record** — observations, indicators with evidence, hedged profile. No score,
  no rank, no percentile, enforced by tests.

Still unimplemented: far-transfer testing, pre/post, delayed retest. All need a second
chapter to exist as content, not just as a design.

## What is not decided

Blocking, in priority order — full list in [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md):

- **Q-002** — Which programme this feeds, and whether any partner runs a staged portfolio.
  Now the top blocker: ADR-0005 is accepted, and a stage-zero gate only exists if there is a
  stage 1 to gate into.
- **Q-001** — Primary learner segment.
- **Q-004** — Playthrough length. Q-013 now asks whether 20 deeper turns is right.
- **Q-015** — Is the Kiswahili register right? Needs a first-language speaker; the app says
  so on screen until it is checked.
- **Q-018** — Are the chapter 2–4 opening balance sheets realistic for Tanzania? Three
  times chapter 1's exposure, and much less common-knowledge — few people can sanity-check
  a term-loan rate.

## Immediate next steps

1. **Author chapters 2, 3 and 4.** This is the one thing standing between the project and
   what session 008 was for. Everything needed is in
   [`contracts/2026-08-08-chapters-2-4.md`](./contracts/2026-08-08-chapters-2-4.md): the
   exact opening state for each chapter, already sized against the engine; which engine
   fields each must exercise and on which turns; which carry flags it must emit; the four
   commands to verify with. The concept tables are in [`docs/arc.md`](../docs/arc.md)
   §5–§7. **Do them one at a time.** Three at once was tried and gains nothing that
   sequencing does not — see `docs/agent-orchestration.md` §4.2.
2. **The owner plays chapter 1 again**, in both languages. Session 008 changed the turn
   loop and the money panel, and sessions 006 and 007 both existed because the owner
   played it and found what no check could see.
3. **Look at it on a real phone.** Still nobody has. The chapter select, the per-product
   ledger rows and the "reaches your hand this week" line have been seen on no screen.
   There is no browser in the working environment; `scripts/smoke-app.mjs` verifies the
   wiring headlessly and can say nothing about layout.
4. **Get the Kiswahili reviewed** (Q-015). Eighteen new interface strings were added in
   008 by exactly the route that raised the question.
5. Verified Tanzanian figures (Q-015, Q-018) so the in-app banner can come down.
6. Reconcile `docs/` with the code. `arc.md` is current; `game-design.md`,
   `curriculum.md` and `assessment.md` are not.
7. Service worker, so ADR-0002's offline requirement is actually met.

## Notes for whoever picks this up next

- Read `AGENTS.md` §2 first. A business-plan builder, pitch scoring and personality
  assessment are all ruled out by the thesis and will look like obvious wins.
- **Run all six checks after any content edit**, and `validate-i18n.mjs` after touching any
  string. Every new UI string needs both languages in `app/content/ui.json`.
- **`validate-scenario.mjs` checks band stability, reachability, structure and scene names
  — not viability.** It has missed two whole-business failures: demand running to zero
  (session 005) and costs compounding to −900,000 (session 006). `scripts/simulate-runs.mjs`
  now exists for exactly this. **Read its output**, with `-v` if you need the detail; do not
  just check that it exited 0.
- **`cash += cashFlow` is the line to be careful around** (D-017). It is `cash += profit`
  by construction whenever the chapter 2–4 fields are at their defaults. If you add a field
  that moves cash, put it in `weeklyCashFlow` and keep the assertion that chapter 1's
  twenty-week cash total is unchanged — it is the cheapest protection in `test-engine.mjs`.
- **Working capital is held in state (`wcHeld`), not derived per week.** It is settled at
  `createState` and reconciled in `advanceWeek`. Deriving a change from a single state
  catches drift and misses every swing the learner caused — that bug was already made once
  in session 008 and fixed.
- **The six carry flags are a closed set on purpose.** A seventh needs a `DECISIONS.md`
  entry (ADR-0007 "revisit if"). Needing one twice means the abstraction is wrong, not that
  the cap is too tight.
- **`chapters.json` listing a chapter with no file is a supported state**, not a bug. The
  app shows a "not ready yet" card, the checks skip it, and `smoke-app.mjs` asserts it.
- **Adding a decision type** touches four places: the engine resolver, the renderer, the
  phase machine in `main.js`, and the validator.
- **A control the learner cannot move, or cannot answer with, is a data-integrity bug,**
  not a cosmetic one — session 007 shipped a prediction window that made three of six
  numeric predictions unanswerable, and the record scored those as the learner's misses.
  `validate-scenario.mjs` now walks for both, but the general lesson is that the checks
  test the model and say nothing about the controls.
- **Verify a deploy by reading back what is served.** Republishing once pushed the old
  build and reported success.
- The owner runs Upendo Honey / Third Man Ltd, Tanganyika Blue and Dark Earth Carbon in
  Tanzania — the available sources of ground truth, and the likely route to a Kiswahili
  reviewer.
