# Session 014 — The balance sheet that is not there

**Date:** 2026-08-09
**Worked by:** Claude (Opus 5), with the project owner
**Branch:** `chapters-3-4-and-balance`
**Duration / scope:** short. One curriculum review prompted by the owner, three
capabilities added, one open question raised. No code changed.

---

## Goal

Directly after session 013 the owner read the curriculum and said:

> "Can you have another quick look at the curriculum. I worry that it overall doesn't
> focus enough on how important your balance sheet and debt to equity ratios are. Also
> taking money out of the company or spending needlessly impacts your ability to increase
> the balance sheet as well"

## What happened

Checked the concern against the code rather than against the map, and it understates
itself. It is not that the balance sheet is under-weighted. **There is no balance sheet
anywhere in the application**, and there is no equity figure, so debt-to-equity is not a
ratio that could be computed today.

What the learner is shown, in full: a week's profit, a week's cash, units sold this week,
a twelve-week projection of a weekly figure, and on the end screen a chart of the last
twelve weeks' *profit*. Every one of those is a **flow**. Nothing in the game shows a
**stock**, so nothing a learner does can be seen to accumulate.

The inputs are all there and unused — `cash`, `assetValue` (equipment at written-down
value, and it does decline with depreciation), `debt`, and `wcHeld` (stock and
receivables less payables, held in state and reconciled weekly). `netWorth` is one line of
arithmetic away and nobody has written it.

The drawings half of the owner's point is the sharpest part. The only turn in any chapter
that takes money out of the business is the closing split, and it is **turn twenty of
twenty**. "Take some home" removes cash and then the chapter ends, so it costs nothing and
teaches nothing. A learner cannot experience a withdrawal compounding, because nothing on
screen compounds.

Three capabilities went into Track 1 under a heading that names what they share — they are
about the stock, where 1.1–1.5 are about the week's flow ([D-029](../DECISIONS.md)):

- **1.6** What the business is worth, not what it earned
- **1.7** How much of it is the lender's
- **1.8** What leaves the business, and what stays in it

All three are marked **not covered** in the coverage table, and `game-design.md` now says
plainly that the balance sheet is absent and that this is not a deliberate omission.

**One thing worth recording:** this closes a loop with `assessment.md`, which lists
**capital discipline** as a candidate indicator that cannot be computed. The reason it
cannot be computed is exactly this — the observation it needs is the balance sheet moving.
The coverage gap and the indicator gap are the same hole seen from two documents.

Nothing was built. [Q-028](../OPEN_QUESTIONS.md) sets out three costed options, and the
third of them re-authors content in all four chapters, which is not an integrator's call.

## Discussion

The owner's concern, in their own words, is quoted above and in Q-028.

**Why this matters more than the other coverage gaps, which is the argument for acting on
it:** `AGENTS.md` §2 makes the livelihood/transformational distinction the spine of the
project. The place that distinction stops being a sentence and becomes a number is the
balance sheet — where the surplus went, week after week, across many small reasonable
decisions. The game currently states the distinction in prose on the chapter select screen
and has no way to show it.

**Considered and not proposed:** re-weighting the existing capabilities instead of adding
new ones. 1.4 already contrasts working capital with durable capacity, so a reader could
argue the balance sheet is implied there. That would have hidden the finding inside a line
that already looks covered, and the finding is that a screen is missing.

## Decisions made

- **[D-029](../DECISIONS.md)** — the capability map gains a stock strand (1.6–1.8), marked
  not covered. Whether to build it is deliberately not decided here.

## Questions raised or resolved

- **Raised: [Q-028](../OPEN_QUESTIONS.md)** — does the game need a balance sheet? Three
  costed options, from a single net-worth line under the money panel through to moving
  drawings off the last turn in all four chapters.

## State at end of session

Docs only: `curriculum.md`, `game-design.md`, plus memory. No code, no content, no check
changed, so the eight checks stand as session 013 left them (only `check-links.sh` was
re-run, and it passes).

## Next steps

**Q-028 is now the top item that would change the product**, ahead of Q-027, and it is
still behind the three that need a person rather than an agent: play it, play it on a
phone, get the Kiswahili read.

If the answer to Q-028 is yes, option 1 is the one to do first and alone — a `netWorth`
line under the money panel with its weekly change. It is small, it is reversible, it
teaches 1.6 by exposure the way profit-versus-cash is taught now, and it is the
prerequisite for both of the others.

## Notes for the next contributor

- **Do not build option 3 before option 1.** Moving the closing split off turn 20 changes
  chapters the owner has played and accepted, and it is pointless until there is a stock on
  screen for a withdrawal to visibly reduce.
- **`wcHeld` is the working-capital balance and it is already correct** — held in state and
  reconciled each week (see `PROJECT_STATE.md`). A net-worth line should read it, not
  recompute working capital from a single state.
- If Q-028 comes back **no**, strike 1.6–1.8 from the map rather than leaving them as
  standing gaps. A capability map that lists what the tool has decided not to teach is a
  different document, and it should say so on purpose.
