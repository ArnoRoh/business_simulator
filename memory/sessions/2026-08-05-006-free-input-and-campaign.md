# Session 006 — Decisions the learner makes

**Date:** 2026-08-05
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code),
with three Codex agents (`gpt-5.6-luna`, high reasoning) via Paseo
**Branch:** `claude/simulator-v2-depth-and-swahili`
**Duration / scope:** Large. Third build. Changes what the learner does, not what they see.

---

## Goal

The owner played the session 005 build and said:

> "it seems to be the same game as the original with just some additional UI portions?"

They were right, and it is worth writing down exactly why, because the mistake is an easy
one to repeat.

Session 005 genuinely changed the **model** — delayed consequences, owner-time overload,
mean-reverting demand, variable time spans. But it changed almost nothing about **what the
learner does**. The loop was still: read a paragraph, pick one of three pre-written
options, guess a direction, read the outcome. Everything added — the ledger, the
before/after comparison, the trajectory panel, the chips — was *output*. Things to look at,
not things to do.

The clearest symptom was the step named "Work it out", which did not ask the learner to
work anything out. It displayed the arithmetic and offered a Continue button. Asked to make
the tool teach more, session 005 answered with more explanation. Depth comes from what the
learner does.

## Discussion

Two scope questions were put to the owner, with the trade-offs stated.

**How far to go.** Offered: free numeric input; or keep options but make the learner compute
and diagnose; or free input *plus* a goal-driven campaign. The owner chose the largest —
**free input and a campaign**.

**What happens to the existing content.** The owner chose **convert some, keep others** —
free input where a number is genuinely the decision, discrete choices where the decision is
categorical. That is the honest reading: forcing "register or not" into a slider would be
false precision.

## What happened

### Decisions are now made, not recognised

Seven turns changed. Six take a number the learner sets — the price twice, hours kept for
working *on* the business, how many people to take on, what discount to offer the hotel —
and one splits profit between the business, the household and a reserve. `t11` gained a
**diagnose** step: read the ledger and say which line caused the loss, before choosing what
to do about it.

Content expresses how a chosen number moves the rest of the business through **declarative
response curves** — `{ field: "demand", perStep: 25, change: -12 }` — never formulas.
Scenarios stay data and stay reviewable by someone who does not program (ADR-0006, D-011).

The controls are steppers with large targets and no typing anywhere, and they give live
feedback as the value moves: *"You keep TZS 350 on each one. At this price, you expect to
lose 54 customers."* That is the thing session 005 should have built instead of a card that
did the sum for you.

### Prediction became a real claim

On a free decision the learner now predicts an **actual profit figure**, not a direction
band, graded close / near / off ([D-012](../DECISIONS.md)). Four direction buckets meant a
guess was right a quarter of the time; a figure is a much more informative claim, and it
retires the awkward part of [Q-014](../OPEN_QUESTIONS.md) for those turns. Three grades
rather than pass/fail because on a free-input prediction almost nobody is exact.

**The number the learner chose is recorded** (`observeInput`). That is the point for the
selection signal: a free decision is far stronger evidence of execution than picking from a
list somebody else wrote (ADR-0004).

### The run became a campaign

A goal now spans the whole playthrough — registered, able to make enough for the hotel
order, and a cash reserve — shown throughout and evaluated at the end. It steers; it never
scores. Recorded as an observation of what was true at the end, never a pass mark, because
completion is the gate and [Q-012](../OPEN_QUESTIONS.md) was settled only days ago
([D-013](../DECISIONS.md)). Going below zero opens a **recovery chapter** with real ways out
— borrow at a weekly cost, cut back, sell equipment — rather than ending the run.

## Working with parallel agents

Three Codex agents ran concurrently in one working tree, against a written interface
contract with **disjoint file ownership**: engine and validators; interface and CSS;
content and translation. `main.js` and every seam were integrated here. Nobody but the
integrator committed.

This is the pattern session 003 tried and got burned by, so what made it work is worth
recording:

- **The contract was written first and was specific** — exact function signatures, exact
  JSON shapes, an explicit table of who may touch which file.
- **Seams were closed by addendum while the agents were still running.** Two gaps surfaced
  after launch: `renderReveal` had to serve three decision types and two prediction kinds,
  and the headless harness needed stable `data-*` hooks. Both were sent to the interface
  agent mid-flight rather than discovered at integration.
- **Agents reported what they had not finished**, accurately. The interface agent flagged
  that `main.js` still called choice-only code on free-input turns; the content agent
  flagged that the validator crashed on the new types. Both were correct, both were in
  files they were told not to touch, and neither worked around it.

## The bugs worth remembering

All three were found by **measuring, not reading** — simulating full runs and printing the
state — and none was caught by the existing checks.

**Fixed costs compounded forever.** A learner who bought everything on credit kept paying
rent on equipment that would long since have been repossessed. Cash reached about
−900,000, which makes the ledger read as broken rather than as a business in trouble. The
first instinct — let the recovery chapter fire more often — was measured and **did not
help**: the hole still reached −600,000, so recovery frequency was never the cause. The fix
is that insolvency sheds what cannot be funded, which bounds the spiral because costs fall
as the business shrinks ([D-014](../DECISIONS.md)).

**Repeated cut-backs could drive rent negative** — the business being paid to exist. Costs
are now floored at zero.

**`t05/test-small` straddled a band boundary** once the turns before it became numeric: it
computed "same" on one path and "up a little" on others. That is the mark-a-learner-
wrong-for-being-right class again, and the third time this project has hit it.

A fourth, smaller one, in my own work rather than the engine: the first attempt to
republish the site **silently pushed the old build**. `git checkout --orphan gh-pages`
failed because the branch already existed, stderr was suppressed, the commit landed on a
detached HEAD, and `git push origin gh-pages` cheerfully pushed the stale branch and
reported success. Caught only by fetching the live JSON and counting the free-input turns.
Verify a deploy by reading back what is actually being served.

## Decisions made

- **[D-011](../DECISIONS.md)** — Learner supplies numbers; content declares response curves.
- **[D-012](../DECISIONS.md)** — Numeric predictions graded close / near / off.
- **[D-013](../DECISIONS.md)** — A goal spans the run, reported but never scored.
- **[D-014](../DECISIONS.md)** — Insolvency sheds what cannot be funded; costs floor at zero.

## Questions raised or resolved

**Partly answered — [Q-014](../OPEN_QUESTIONS.md).** Prediction bands no longer apply to the
six free-input turns, where the learner names a figure instead. Bands still govern the
fourteen categorical turns, so the question stays open for those.

**Still open — [Q-013](../OPEN_QUESTIONS.md).** The run is longer again. Nobody has timed it.

## State at end of session

Playable in English and Kiswahili. 20 turns, of which 6 are free-input and 1 is an
allocation, plus a diagnose step and recovery chapters that insert themselves when cash goes
negative. All four checks green:

- `test-engine.mjs` — **124 assertions** (was 74), including regression tests for both
  engine bugs above.
- `validate-scenario.mjs` — **42/42** choice predictions and **18/18** numeric turn paths,
  the latter sweeping every value in each input range across all three robot paths.
- `validate-i18n.mjs` — every string in both languages.
- `check-links.sh`.

Driven headlessly in jsdom through full playthroughs in both languages and across three
input strategies, plus a run that takes every neglectful option. Goal reachability was
checked separately: a careful run reaches 3 of 3, a careless one 0 of 3, so it discriminates
without being automatic.

**Live at https://arnoroh.github.io/business_simulator/** — verified by fetching the served
content back, not by assuming the push worked.

## Notes for the next contributor

- **`validate-scenario.mjs` checks band stability and numeric sanity, not viability.** It
  has now missed two whole-business failures — demand running to zero in session 005 and
  costs compounding here. If you touch the drift or cost rules, simulate full runs and
  print the state. That is how both were found.
- **Adding a decision type** means touching four places: the engine resolver, the renderer,
  the phase machine in `main.js`, and the validator. The contract at the top of this entry
  is the map.
- **`build-single-file.mjs` now derives each module's imports** from its real `import`
  statements instead of a hand-maintained list. Adding an import used to break the
  single-file build silently while `app/` kept working.
- **Still nobody has seen any of this on a real phone.** There is no browser in this
  environment. Everything is verified headlessly, which covers behaviour and text and not
  layout — and the controls added here are precisely the kind of thing that goes wrong on a
  small screen.
- **`docs/` is now further behind again.** `game-design.md`, `assessment.md` and
  `curriculum.md` still describe the session-001 design and now do not mention free input,
  goals, recovery or numeric prediction at all.
