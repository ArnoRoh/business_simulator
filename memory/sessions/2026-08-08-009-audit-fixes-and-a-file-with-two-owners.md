# Session 009 — an audit, six fixes, and a file with two owners

**Date:** 2026-08-08
**Worked by:** Claude (Opus 5)
**Branch:** `main` — **nothing committed.** See "State at end of session".
**Duration / scope:** Medium. No new content authored; five defects fixed in the engine,
the app and the checks, plus three in chapter 2's content.

---

## Goal

The owner asked: is the upgrade finished, check everything for bugs and lint, and make
sure the gameplay is educational and rewarding enough that people play it through.

## What was found

### The arc is half-written

`chapters.json` lists four chapters. Chapter 1 is committed and playable. **Chapter 2,
the bakery, exists as an untracked file that nobody has committed.** Chapters 3 and 4 do
not exist at all. "Play through it all" is currently not possible past chapter 2.

### `smoke-app.mjs` was broken on `main` and nothing said so

It crashed outright. The unauthored-chapter test hardcoded `bakery|factory|export`, so
the moment the bakery was written it clicked into a real chapter, and the "Start again"
button restarts the chapter in progress rather than returning to the list — leaving no
chapter cards for the next assertion to click. Two things follow from that:

1. **CI never ran it.** `docs-checks.yml` still said "there is no application code yet",
   which stopped being true at session 003. Five checks ran on contributors' machines
   and nowhere else. Now fixed — the workflow runs all five.
2. **`validate-scenario.mjs` with no argument only ever validated chapter 1.** A second
   chapter could be authored, listed, loaded by the app and shipped without this check
   looking at it, which is what happened. It walks the manifest now, one child process
   per chapter.

### Resuming after a recovery turn skipped an authored turn

Recovery chapters are spliced into `scenario.turns` at run time, but the scenario file is
re-fetched clean on every load and only `turnIndex` was saved. On the target devices the
app is killed and restarted often — `storage.js` says so in its header — and every resume
after a recovery moved the learner one authored turn forward, ending the chapter early.
Two recoveries, two turns lost. `session.recoveryAt` is saved now and the splices are
rebuilt on load. There is a smoke assertion, and it fails without the fix.

### The insolvency capacity floor did not apply to any chapter with a product mix

`advanceWeek` floored the capacity *total* but shrank each product line by a flat 0.9 and
never recomputed the total from the lines. In chapters 2–4, which are the only ones with
lines, capacity kept falling past the floor week after week — the unbounded decay
[D-014](../DECISIONS.md) exists to prevent, arriving through the product-mix fields.

### Turn 6 of the bakery was a scripted bankruptcy

All three options set `debtorWeeks: 4`. `debtorWeeks` is a **whole-business average**: the
engine applies it to all revenue, not to the wholesale share. Four weeks of a bakery
turning over ~1.16m a week is ~3.4m of cash absorbed in one step, against an opening
balance of 900,000. Every strategy went insolvent at t06 whatever it chose — including the
option that takes twenty loaves a week — and every one of them was told first that their
choice mattered. Thirty-day terms on roughly a fifth of sales is about 0.8 weeks blended.
Now 0.8 / 0.4 / 0.15 by option.

`concentrated: true` was also set by all three, so the carried flag recorded a fact about
the learner that the learner could not avoid.

### The prediction bands do not fit anything but a stall

`BAND_SAME` and `BAND_LOT` were fixed at 1,500 and 12,000 shillings. In chapter 1, "up a
lot" is reached by **one option in forty-two**. In the bakery, "up a little" is reached by
**two in forty-five**. Both chapters offer a four-way prediction that behaves as a
three-way one, and a different three each time — and prediction accuracy is the signal the
assessment rests on ([Q-014](../OPEN_QUESTIONS.md)).

The engine now takes per-chapter edges (`setBands`, alongside `setCurrency`), defaulting
to the stall's figures so chapter 1 is untouched — asserted, 42/42 unchanged. **The bakery
has not adopted scaled edges**; see the ownership note below.

### Everything still ends badly

Neither chapter has a strategy that finishes well. All four corner strategies in chapter 1
and all four in the bakery end loss-making, insolvent, or both. `simulate-runs.mjs` says so
now — it never checked, and its "to hand" column was computed with `weeklyCashFlow(state, 0)`,
which asserts no working-capital movement and so read as if the money were fine on exactly
the turns where a chapter 2–4 business is draining.

These are warnings, not failures. The four strategies are crude — "always take the first
option" is closer to not engaging than to playing cautiously — and a run that ends in
trouble can be the lesson. But four out of four in both chapters is not a lesson, it is a
trajectory, and it is the direct answer to "rewarding enough to play through". **It is not
fixed and it needs the owner**, because rebalancing chapter 1 is a design decision on
content the owner has already played and accepted.

## Decisions made

None recorded in `DECISIONS.md` yet — see below. Two are pending the owner:
per-chapter prediction band edges, and what to do about the ending trajectory.

## State at end of session

All six checks pass: `test-engine` 219, `validate-scenario` (42/42 and 45/45 across two
chapters), `validate-i18n`, `simulate-runs`, `smoke-app` 23, `check-links`.

**Nothing is committed, and `PROJECT_STATE.md`, `DECISIONS.md` and `OPEN_QUESTIONS.md`
have deliberately not been updated.** The reason is the next section.

## The thing that needs saying

**Five Claude agents were running with `cwd` set to this repository, four of them not
this session.** One of them is editing `app/content/scenario-bakery.json` live. This was
established, not inferred: the file changed twice while this session made no edit to it,
once rewriting a comment this session had written and reverting a value with it.

That is the failure mode `docs/agent-orchestration.md` was written after. Nobody agreed a
contract, nobody owns the file, and two agents converged on different fixes for the same
defect within ten minutes of each other. Some of this session's content changes survived
in the file and some did not.

Committing was not attempted, because a commit would capture another agent's
half-finished file alongside this session's work, and because `AGENTS.md` §8 forbids
committing to `main` directly in any case.

## Next steps

1. **Decide who owns the bakery file** and stop the other agents in this repository, or
   give them slices that do not overlap. Until then no content change here is safe.
2. Author chapters 3 and 4. Unchanged from session 008 — the contract, the opening states
   and the concept tables are all still in place.
3. **The ending trajectory.** Every corner strategy in both chapters ends in trouble.
   Decide whether that is the lesson or a balance problem, on chapter 1 first, because
   chapter 2 was sized against it.
4. Adopt scaled band edges in the bakery once the file has one owner.
5. Still nobody has looked at it on a phone.
