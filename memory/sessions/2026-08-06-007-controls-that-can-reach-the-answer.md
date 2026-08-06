# Session 007 — Controls that can reach the answer

**Date:** 2026-08-06
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code)
**Branch:** `main`
**Duration / scope:** Small in code, large in consequence. Two bugs in the free-input
mechanic that session 006 introduced, both found by the owner playing it.

---

## Goal

The owner played the v3 build and reported two things:

> "I couldn't change the prices on the mandazi. I think also now it is too complicated,
> the pricing and estimating earnings are hard"

Both turned out to be defects, not preferences.

## What happened

**The price stepper was pinned at its own minimum.** Turn `t01` offers a price range of
575–650 while the starting price is 500. `renderNumberDecision` clamps the starting value
into the range, so the control opened at 575 — its floor — and both minus buttons were
live-looking and completely inert. Press minus twice, nothing moves, conclude the app is
broken. That is exactly what happened.

**The prediction window could not contain the true answer.** `renderPredictNumber` built a
fixed window of ±10 steps of 1,000 around the current profit. Simulating the whole scenario
across three paths:

| turn | current profit | actual after the decision | inside ±10,000? |
|---|---|---|---|
| t01 | 16,000 | 26,525 | **no** |
| t13 | 18,827 | 54,447 | **no** |
| t19 | 29,174 | −34,351 | **no** |

Three of the six numeric predictions were unanswerable. A learner who reasoned perfectly
was graded *off* and had no way not to be. Since the behavioural record is the whole point
of the instrument (ADR-0004), this was recording the control's limits as the learner's
calibration.

**What was changed:**

- `predictionWindow(state, turn)` in `engine.js` sizes the prediction stepper from
  `decisionOutcomes()` — every profit the turn's decision space could produce, over every
  value of a number input or every option of a choice. Widened by half the spread again so
  the truth is never at the edge, centred on the current profit, with a round step of
  roughly a twentieth of the window. Because it covers the whole decision space, the window
  says nothing about which outcome is coming.
- `gradePrediction()` takes the step as a third argument and floors its tolerance at
  0.6 × step, so landing on the nearest value the control can reach grades *close*. Called
  with no third argument it behaves exactly as before, which is what the existing tests
  assert.
- `t01` price range is now 500–650 and `t02` 500–650, both including where the learner
  actually is. `t01` gained a fourth band for holding the price at 500, teaching the thing
  that was invisible before: at 500 the stall is already selling out at midday, so a low
  price is not buying any extra sales.
- Every stepper button that cannot move the value is now `disabled` and faded. At the end
  of a range that reads as "you are at the limit" rather than "this is broken".
- The price decision now shows the multiplication, not just the pieces: *"You keep TZS 200
  on each one. About 180 sales a week, so TZS 36,000 before rent and wages."* It stops at
  the gross, before rent and wages, so the prediction that follows is still the learner's
  own arithmetic.
- The prediction card keeps the two numbers the estimate is built from on screen — margin
  per sale and weekly fixed costs. They were shown on the work-it-out card and then taken
  away, which turned an arithmetic step into a memory test.
- `validate-scenario.mjs` walks three paths checking both properties. This is the fourth
  whole-class failure the existing checks did not see; band stability said nothing about
  whether a control could reach anything.

## Dead ends

**Widening the price floor to 400.** Tried first, since undercutting a cheaper competitor
is a real strategic option at `t02`. It breaks four later turns: the always-cheapest path
goes insolvent early, D-014 sheds costs the business cannot fund, and `t04/first-come`,
`t06/drop-samosa`, `t07/buy-fryer` and `t09/ask-later` each flip from their declared *down*
to *same* on that path. 475 still trips `t07`. So the floor is the starting price. The
trade-off is logged in D-015 and is worth revisiting properly rather than by moving a number.

## Decisions made

- **D-015** — Every control must be able to reach the answer. See `../DECISIONS.md`.

## Verification

All four checks green: engine 135 (11 new), scenario 42/42 options + 21/21 numeric paths
plus the new reachability walk, i18n, links. `standalone.html` rebuilt.

Beyond the checks: a throwaway DOM shim rendered both stepper cards headlessly and
confirmed the price control opens at TZS 500 with the minus buttons disabled, steps to 650
and back, and commits. And a full-run simulation across three policies now shows every
numeric prediction reachable, gradeable *close* at its best reachable value, and never more
than four single presses from the starting position.

## Open questions raised

- The Kiswahili for the new band and the two new UI strings is unreviewed, like the rest
  (Q-015).
- Nobody has seen the disabled-button styling on a real screen. There is still no browser
  in this environment.

## For the next session

The owner should play `t01` and `t02` again specifically, and any turn that asks for a
profit figure. The question that remains open by argument is whether the estimate is now
*possible* but still *unpleasant* — if so, the next move is to show the learner the
arithmetic scaffold on the prediction card rather than only its inputs.
