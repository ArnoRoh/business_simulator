# Session 011 — chapters 3 and 4, and a control that measured from zero

**Date:** 2026-08-08
**Worked by:** Claude (Opus 5), with two content agents under a contract
**Branch:** `chapters-3-4-and-balance`
**Duration / scope:** Large. The arc is content-complete: four chapters, twenty turns each,
both languages, all six checks green.

> **This entry was written at the close of the session**, in a final pass that verified the
> tree, corrected one memory error, updated `PROJECT_STATE.md` and committed. The narrative
> of the content work below is reconstructed from the contract, from
> [D-021](../DECISIONS.md) and [D-022](../DECISIONS.md), and from the diff — those decisions
> were logged as they were made, which is what made the reconstruction possible. Where it
> says *why* something was done, that is the source; it is not memory of the moment.

---

## Goal

Author chapters 3 (factory) and 4 (export), which session 008 designed and session 010 left
listed in the manifest with no files behind them. Then finalise: get every check green and
land the lot.

## What happened

**The two chapters were written, and then they failed the validator.** Nineteen option
predictions across the two were wrong — the declared `predictAnswer` was not what the engine
computed (`!!`), or the option landed in different bands depending on the path the learner
took to reach the turn (`~`). Four in the factory, fifteen in the export chapter. Both
shapes mark the learner wrong for being right; the second just has a longer fuse.

**Two agents fixed them in parallel, under a written contract**
([`contracts/2026-08-08-prediction-fixes-3-4.md`](../contracts/2026-08-08-prediction-fixes-3-4.md)).
One file each, nothing shared: the two chapters carry their own `bands`, so `setBands` is
called per chapter and the slices touch no common state. That is the only reason the split
was made — session 009 had two agents converge on different fixes for the same defect in one
file, and `AGENTS.md` §6 now requires the seam to be written down first. Both chapters now
verify 45/45 with 0 problems.

**Underneath thirteen of the nineteen were two authoring shapes, not nineteen mistakes**
([D-022](../DECISIONS.md)). An option that changes the order book has to move `demand` *and*
`capacity`, because demand alone does nothing when the firm is already capacity-constrained
and raises spoilage when it is not — so the *sign* of the outcome depended on where an
earlier decision had left the firm. And any field an earlier turn can also move needs a
signed delta (`"+60"`), because an unsigned number is an absolute set that means "whatever
the author assumed the state was". Chapter 4 had set an export price *of* 60 where it meant
to add 60. Widening the band edges until the unstable options fit was considered and
rejected: it passes the validator by making the prediction meaningless in exactly the turns
where the business is most exposed.

**Then the real one.** `state['lines.export.price']` is `undefined`, because lines live in
an array and content addresses them by path. Every caller asking "where is the learner now?"
used a plain index and silently got zero — so a response curve authored as "for every 50
shillings you move the price" was measured **from zero instead of from the price**. Chapter
4's export pricing turn charged 34–50 reputation for naming any price at all. Chapter 3's
pricing turn wiped roughly 2,000 loaves of weekly demand for holding its own price steady.
Both were recorded as the learner's judgement. The fix is `readField(state, field)` in the
engine, used by the `start: "current"` anchor, the stepper's opening position, the response
feedback and the validator's monotonicity check ([D-021](../DECISIONS.md)).

The first version of that fix re-anchored the two turns on authored constants. It was
abandoned once the cause was understood: it works until an earlier turn moves the same price
— chapter 4 has one that does — and it leaves the trap armed for the next author who writes
the obvious thing. The validator now **FAILs** a number input whose field is not a real state
field, or whose `start: "current"` has nothing to anchor on. None of the existing checks
could have caught this: a curve measured from the wrong anchor is still finite, still maps to
a band, and is still monotonic, which was everything the validator asked. Same lesson as
[D-015](../DECISIONS.md) — the checks test the model and say almost nothing about the
controls.

**A wider stability sweep was added**, and it found more. Three fixed paths (first option,
middle, last) are paths nobody walks. A 400-path random sweep with a fixed seed now runs
alongside them and **reports**, deliberately without failing — see [Q-022](../OPEN_QUESTIONS.md).
It found drift in three of the four chapters, in content the three-path check had just passed
clean.

**Housekeeping that had gone stale.** `standalone.html` was a whole chapter out of date and
nothing noticed; it is rebuilt (613 KB with four chapters embedded, against a ~230 KB shell
plus one 115–145 KB chapter for the served app — the size argument is now written into
`app/README.md`, because a learner pays for their own megabytes). Four interface strings no
code had referenced since session 007 were removed from `ui.json`. The glossary gained the
trade, cost and cash vocabulary chapters 3 and 4 teach, so the content, the engine's state
field names and the docs cannot drift apart. Session 010's entry, never written, was
reconstructed and committed here.

## Decisions made

- **[D-021](../DECISIONS.md)** — a control anchors on a value that exists, and the checks
  prove it.
- **[D-022](../DECISIONS.md)** — an effect that must survive every path moves the whole
  constraint, and is signed.

## Questions raised or resolved

- **Raised: [Q-022](../OPEN_QUESTIONS.md)** — should the 400-path sweep fail rather than
  report? Not while it would turn the owner's accepted chapter 1 red by an integrator's
  choice.
- **Raised: [Q-023](../OPEN_QUESTIONS.md)** — is the export chapter now too easy? `attentive`
  finishes at ~137m and reputation 77, against ~97m and 33 before D-021 — but every earlier
  run was measuring a broken control, so there is no honest calibration to compare against.
- **Raised: [Q-024](../OPEN_QUESTIONS.md)** — bakery turn 16 is a prediction with only one
  answer. All three options declare `same`.
- **Corrected:** Q-022's table claimed the factory holds 45/45 across the sweep. It prints
  41/45. Fixed from what the check says, in the closing pass.

## State at end of session

**The arc is content-complete.** Four chapters, twenty turns each, English and Kiswahili,
each with its own band edges. Nothing is half-finished and nothing is stubbed.

All six checks green: engine (226), scenario (177/177 option predictions and 75/75 numeric
turn paths across four chapters, 0 problems), i18n (1,777 content strings × 2 languages),
`simulate-runs` (no whole-business failures; `attentive` finishes every chapter), smoke (29),
links (296).

Open and visible, not hidden: the random sweep reports drift in chapters 1, 2 and 3 (Q-022),
bakery t16 cannot discriminate (Q-024), and chapters 3 and 4 carry `unverified: true`, which
the app shows on screen, because their opening balance sheets and their payroll and duty
figures have not been checked by anyone with local ground truth (Q-018).

## Next steps

1. **The owner plays it.** Chapter 1 in both languages first — sessions 006 and 007 both
   exist because the owner played it and found what no check could see, and 008, 010 and 011
   have all changed the turn loop since. Then chapter 4, for Q-023.
2. **Rule on Q-022**, which is the gate on making the sweep a FAIL, and on Q-021.
3. **Look at it on a phone**, and play a chapter with the connection off. `sw.js` exists and
   is verified headlessly; nobody has installed the app on a device.
4. **Get the Kiswahili reviewed** (Q-015) — there are now four chapters of it.
5. **Verify the Tanzanian figures** in chapters 3 and 4 (Q-018), so `unverified` can come
   off and the in-app banner can come down.
6. Reconcile `docs/` with the code. `arc.md` is current; `game-design.md`, `curriculum.md`
   and `assessment.md` are behind.

## Notes for the next contributor

- **`readField` is the only way to read a state field by its authored name.** A plain index
  works for flat fields and silently returns `undefined` for `lines.<id>.<field>` — which
  becomes 0 through `Number(x) || 0`, which is a control that lies. If a third address space
  ever appears, D-021 says the honest response is to store lines as a map, not to grow the
  helper.
- **Write signed deltas** (`"+60"`, `"-0.045"`) for anything an earlier turn can also move.
  An unsigned number is an absolute set.
- **`spoilRate` charges unsold capacity only.** It is not transit damage and not anything
  that happens to goods that ship. Chapter 4's packaging turn used it for both and cost an
  afternoon.
- **`drift` lines in `validate-scenario.mjs` are real findings, not noise.** They do not fail
  the run only because Q-022 is the owner's call. Do not learn to scroll past them.
- **The band edges are not free choices.** Each chapter's were picked to land in a gap
  between clusters of outcomes (D-018); rounding them off will make options unstable.
- **Rebuild `standalone.html` after any change under `app/`.** It went a whole chapter stale
  between sessions 008 and 011 and no check noticed.
