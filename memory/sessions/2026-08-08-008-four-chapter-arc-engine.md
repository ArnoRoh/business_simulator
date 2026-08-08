# Session 008 — the four-chapter arc, and the engine to carry it

**Date:** 2026-08-08
**Worked by:** Claude (Opus 5), with the project owner answering three design questions
**Branch:** `main`
**Duration / scope:** Large. Design docs, an ADR, a substantial engine extension, a new
chapter layer, two new checks. **The 60 turns of chapter content this was all built for
do not exist** — see "State at end of session".

---

## Goal

The owner's request, as made:

> "Have a look at the current code base. I think we want to keep things a bit more basic,
> but let's have a deeper dive on more advanced concepts of business management. Do this
> with a different scenario (maybe the mandazi sales lady now owns a full bakery, and then
> the next chapter a large scale factory, and finally exporting). Can you please plan this
> out in full and use subagents to do the work."

## Discussion

Three questions were put to the owner before any work started, because each changed the
job materially. All three were answered.

**1. What does "more basic" apply to?** Three readings were offered: simplify the
interaction, simplify the economic model, or change nothing and just add chapters.
**Chosen: simplify the interaction, put the depth entirely into the content.** The
economic model was explicitly *not* the thing to cut back, which is what licensed the
engine extension below.

**2. How do the chapters connect?** Offered: full state carry-forward (a real campaign),
standalone chapters with fixed starts, or a hybrid. **Chosen: the hybrid** — authored
opening plus a few carried flags.

*Rejected, and worth not re-proposing:* full carry-forward. It is the more satisfying
design and it was turned down for a specific reason, recorded in
[ADR-0007](../../docs/adr/0007-four-chapter-arc.md): it removes the fixed opening state
that `validate-scenario.mjs` walks from, and prediction windows (D-015) cannot be sized
against a state nobody can enumerate. Also rejected: no carry at all, which survives every
check and throws away the only thing chapters offer over four unrelated scenarios.

**3. How big is each chapter?** Offered: ~12–15 turns, match chapter 1's 20, or build one
chapter fully and outline the rest. **Chosen: 20 turns each** — the largest of the three,
60 new turns of bilingual content.

## What happened

### The design came first, in the repo

[`docs/arc.md`](../../docs/arc.md) is the artefact, and it is the plan the owner asked
for. Four chapters, each named by the shift it teaches and by what kills you in it:

| Ch | Business | What kills you |
|---|---|---|
| 1 | Mandazi stall *(exists)* | Not knowing your margin |
| 2 | Bakery | Running out of cash while profitable |
| 3 | Factory | Capacity you cannot fill or supervise |
| 4 | Export | Someone else's standard, in someone else's currency |

All 60 concepts are enumerated there, per chapter, in order, with the decision each one
becomes. That table is the specification for the content that still has to be written.

The argument for chapters rather than one longer scenario is in ADR-0007 and is worth
restating because it is the whole justification for the session: a stall cannot teach the
capabilities `AGENTS.md` §2 commits this project to, because a stall is never destroyed by
neglecting them.

### The engine grew, and chapter 1 did not move

D-017: advanced concepts go in the **engine**, surfacing as lines in the ledger the
learner already reads — never as new controls. Working capital is taught by cash and
profit visibly diverging in the money panel, which is also how the concept presents in a
real business.

Added, every one defaulting to contribute nothing: product lines (`lines[]`, with
per-product contribution margin), depreciation, debt with interest and repayment, working
capital (`debtorWeeks` / `inventoryWeeks` / `creditorWeeks`), payroll on-costs, FX, landed
cost, and per-chapter owner-hour scaling.

The load-bearing change is one line. `advanceWeek` used to do `cash += profit`; it now
does `cash += cashFlow`. Those are **equal by construction** whenever the new fields are
at their defaults, so chapter 1 is untouched — asserted directly, and also over a full
twenty-week run, in `test-engine.mjs`.

Two things were got wrong on the first attempt and are worth recording:

- **Working capital was measured across the wrong seam.** It was computed inside
  `advanceWeek` from that function's own start state, which catches drift and misses
  every swing the learner actually caused — decisions are applied by the caller *before*
  any week passes. Fixed by holding the balance in state (`wcHeld`) and reconciling
  against it, so any movement since it was last settled is picked up whoever caused it.
- **Owner hours did not scale.** `baseOwnerHours` was fixed at one hour per six units,
  which is right for a stall and demands 2,500 hours a week at factory volumes. Now
  authored per chapter via `hoursPerCapacity` / `hoursPerStaff`, defaults reproducing the
  old numbers exactly.

### The chapter layer

New `app/js/carry.js` — six flags, closed set, with the rules that keep them honest:
they tint and never gate, an absent flag never matches, and a learner arriving with
nothing gets the authored opening untouched and zero opening notes. That last case is the
one the whole design rests on and it is asserted in three places.

`app/content/chapters.json` is a small manifest loaded at startup; scenario files are
fetched one at a time when a chapter is opened, because learners pay per megabyte and
four scenarios is four times the download for three they may never open.

### The interaction got simpler

`workout` is now opt-in per turn, and automatic wherever the prediction is a number. The
common turn is `situation → decision → predict → reveal`.

It was **not** removed outright, deliberately. Session 007 added it because estimating a
profit figure was too hard (Q-017), and that fix has never been tested by anyone but its
author. Deleting it would have undone an unproven repair to solve a different problem.
The contract caps it at four turns per chapter.

### Two new checks, and why

`scripts/simulate-runs.mjs` plays every chapter four ways and prints cash, profit, what
reaches the bank, demand, capacity, reputation and the cash cycle. This is
`docs/agent-orchestration.md` §4.4 applied: `validate-scenario.mjs` has now missed two
whole-business failures, and both were found by simulating runs and looking at numbers.
It checks for demand collapse, unbounded cost spirals, a run where nothing ever moves,
and — new — a chapter 2–4 where cash and profit never diverge, which means its advanced
content is being narrated rather than modelled.

`scripts/smoke-app.mjs` drives the real application against a stub DOM. There is no
browser in this environment, and session 003's worst failure (every scene a solid black
rectangle) was wiring that type-checked and did not work. It cannot see layout or colour.
It can see that the chapter select renders, that opening a chapter starts it, that a turn
walks its phases, and that a chapter listed but not yet authored says so instead of
throwing.

Also: `validate-scenario.mjs` now rejects an unknown `scene` name. `drawScene` silently
falls back to drawing a mandazi stall, which in a factory chapter is worse than drawing
nothing, and nothing anywhere reported it.

### The delegation, and how it went

`docs/agent-orchestration.md` was followed properly for once: the contract
([`memory/contracts/2026-08-08-chapters-2-4.md`](../contracts/2026-08-08-chapters-2-4.md))
was written **in the repo** with exact JSON shapes; the engine, validator and manifest
were **landed and green before anyone was briefed**, so agents would import real code
rather than build against a description; slices were one file each with no overlap; each
agent was briefed on its own chapter section only; and the three opening balance sheets
were sized numerically by the integrator rather than delegated, because a chapter that
opens loss-making wastes an agent's entire run.

**All three agents then died on an API session limit before writing a single line.** The
preparation is intact and the content is not. This says nothing about whether the split
was a good one — it was never tested.

## Decisions made

- **[D-016](../DECISIONS.md)** — Four chapters, bounded starts, six carried flags.
  ([ADR-0007](../../docs/adr/0007-four-chapter-arc.md))
- **[D-017](../DECISIONS.md)** — Advanced concepts go in the engine, not in new controls.

## Questions raised or resolved

- **Raised: [Q-018](../OPEN_QUESTIONS.md)** *(blocking for chapters 2–4)* — Are the
  chapter 2–4 opening balance sheets realistic for Tanzania? Three times chapter 1's
  exposure, and far less common-knowledge.
- **Raised: [Q-019](../OPEN_QUESTIONS.md)** — Does anyone play past chapter 1? ADR-0007
  assumes so and nothing supports it.
- **Raised: [Q-020](../OPEN_QUESTIONS.md)** — Do the carried flags feel like anything, or
  read as nothing at all?

## State at end of session

**Everything the content needs is built, tested and green. The content does not exist.**

All six checks pass: `test-engine` 211, `validate-scenario`, `validate-i18n`,
`simulate-runs`, `smoke-app` 17, `check-links`.

`chapters.json` lists four chapters and only `mama-asha` has a file. **This is a
deliberate, tested state, not a broken one** — the manifest is allowed to run ahead of the
content. `validate-i18n` reports and skips the missing files, `build-single-file` skips
them, and tapping an unauthored chapter in the app shows a "not ready yet" card and
leaves the app usable. There is a smoke assertion for exactly that.

Nothing is half-written. There are no stub scenario files to clean up.

## Next steps

1. **Author the three chapters.** Everything needed is in
   [the contract](../contracts/2026-08-08-chapters-2-4.md): the exact opening state for
   each chapter, already sized against the engine; which engine fields each chapter must
   exercise and on which turns; which carry flags it must emit; the four commands to
   verify with. The 20-concept tables are in `docs/arc.md` §5–§7. Run them one at a time
   rather than three at once — elapsed time is not scarce here and sequencing removes the
   whole class of integration failure (`agent-orchestration.md` §4.2).
2. **The owner plays chapter 1 again**, in both languages. Sessions 006 and 007 were both
   triggered by the owner playing it and finding something no check could see, and this
   session changed the turn loop and the money panel.
3. **Look at it on a real phone.** Still nobody has. The chapter select, the per-product
   ledger rows and the "reaches your hand this week" line have been seen on no screen.
4. Q-018 needs someone with Tanzanian ground truth before chapters 2–4 lose their
   `unverified` banner.
5. Get the Kiswahili reviewed (Q-015). Eighteen new interface strings were added this
   session by the same route that raised it.

## Notes for the next contributor

- **`cash += cashFlow` is the line to be careful around.** If you add a field that moves
  cash, add it to `weeklyCashFlow`, and add an assertion that chapter 1's twenty-week cash
  total is unchanged. That assertion exists and is the cheapest protection in the file.
- **`validate-scenario.mjs` still says nothing about viability.** It checks bands,
  reachability, structure and now scenes. Run `simulate-runs.mjs` and *read the numbers* —
  it has a `-v` flag. Both historic whole-business failures were invisible to the
  validator and obvious in that output.
- **Working capital is held in state, not derived per week.** `wcHeld` is settled at
  `createState` and reconciled in `advanceWeek`. If you find yourself recomputing it from
  a single state to get a change, re-read the comment there — that is the bug that was
  already made once.
- **The six carry flags are a closed set on purpose.** Adding a seventh needs a
  `DECISIONS.md` entry (ADR-0007 "revisit if"). Needing one twice is the signal the
  abstraction is wrong, not that the cap is too tight.
- **`workout` is capped at four turns per chapter.** It is not free: it was a fix for
  Q-017 and it lengthens every turn it appears on. The owner asked for a simpler
  interaction and that cap is where the request lives in the content rules.
- **Do not brief three content agents simultaneously again** — not because it failed here
  (it failed on a quota, which proves nothing), but because
  `agent-orchestration.md` §4.2 already says sequencing is strictly better when elapsed
  time is not scarce, and it is not scarce here.
