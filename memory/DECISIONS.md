# Decision log

Append-only, newest at the bottom. Record a decision **when it is made**, not
retrospectively.

Anything expensive to reverse also gets an ADR in [`docs/adr/`](../docs/adr/); this log
carries the one-line pointer. Smaller decisions live here only.

**Format**

```
## D-NNN — Short title
**Date:** YYYY-MM-DD · **Decided by:** who · **ADR:** link or —
**Decision:** what was decided, in one or two sentences.
**Why:** the reasoning, including what it trades away.
**Considered and rejected:** the alternatives, and why they lost.
**Revisit if:** the condition that would reopen this.
```

The *rejected* alternatives are the most valuable part. Without them the next
contributor re-proposes them.

---

## D-001 — Bootstrap the repository at documentation stage, not code stage
**Date:** 2026-08-02 · **Decided by:** Project owner + Claude · **ADR:** —
**Decision:** Set the repository up with operating guide, memory system, governance and
design documentation. Write no application code yet.
**Why:** The hard problems here are pedagogical and evidential, not technical. Writing
code before the curriculum and assessment model are specified would lock in a shape
that the design work then has to fight.
**Considered and rejected:** (a) Scaffold plus a runnable PWA skeleton — rejected as
premature; a skeleton invites feature work before the model is settled. (b) Scaffold
plus deep curriculum content — deferred until the target learner segment (Q1) is
resolved, since it determines what the curriculum is.
**Revisit if:** A demo is needed for a funder or partner conversation on short notice.

## D-002 — Delivery target is a mobile-first, offline-capable PWA
**Date:** 2026-08-02 · **Decided by:** Project owner · **ADR:** [ADR-0002](../docs/adr/0002-mobile-first-offline-pwa.md)
**Decision:** Build for low-end Android via the browser, installable, functional
offline after first load, with a small data footprint.
**Why:** Matches the device and connectivity reality of the target learners, and avoids
app-store distribution friction for a programme that will be deployed through partner
organisations rather than consumer channels.
**Considered and rejected:** Native Android — better offline and device integration,
but distribution and update friction is high and it excludes non-Android users
entirely. Facilitator-led in-person mode was not rejected, only deferred; it remains a
plausible addition once the core loop works.
**Revisit if:** Pilot partners report the PWA install flow is a barrier in practice, or
if a feature genuinely requires native capability.

## D-003 — Dual licence: MIT for code, CC BY-SA 4.0 for content
**Date:** 2026-08-02 · **Decided by:** Project owner · **ADR:** [ADR-0003](../docs/adr/0003-dual-licensing.md)
**Decision:** Source code under MIT. Curriculum, scenarios and other learning content
under Creative Commons Attribution-ShareAlike 4.0.
**Why:** Permissive code licensing maximises reuse and satisfies most institutional
funders. Share-alike on content keeps derived training material open, which matters
when the material is publicly funded.
**Considered and rejected:** MIT throughout — simpler, but allows curriculum to be
enclosed in closed products. Apache-2.0 + CC BY — the patent grant is not obviously
needed here and CC BY permits closed derivatives of content.
**Revisit if:** A funder or major partner requires different terms, or if share-alike
proves to be an obstacle to adoption by government training programmes.

## D-004 — The simulator is a selection instrument, not a business-plan trainer
**Date:** 2026-08-02 · **Decided by:** Project owner (via background note) · **ADR:** [ADR-0004](../docs/adr/0004-simulator-as-selection-instrument.md)
**Decision:** The primary output is a record of *observed decision behaviour* over
simulated time, intended to function as a cheap first-stage execution test. The tool
will not produce a polished business plan or pitch as its headline artefact.
**Why:** The owner's background note sets out the evidence that business-plan scores
and pitch quality predict firm performance poorly, while observed execution predicts
better. Building a plan generator would optimise precisely the signal that does not
work, and would make the tool complicit in the selection failure it exists to address.
**Considered and rejected:** A plan- or pitch-builder as the main output — the obvious
product shape, and the one most grant programmes would ask for. Rejected on evidence.
It may still appear as a *by-product* of play, clearly subordinate to the behavioural
record.
**Revisit if:** Partner programmes cannot ingest a behavioural record and can only
accept plan documents — in which case the conflict needs surfacing explicitly rather
than resolving quietly in favour of the plan.

## D-005 — Geographic sequence: Tanzania first
**Date:** 2026-08-02 · **Decided by:** Project owner · **ADR:** —
**Decision:** Ground the first scenarios and regulatory detail in Tanzania, then extend
to Kenya, Uganda, Rwanda and Ethiopia.
**Why:** The owner has direct operating experience and live firms in Tanzania, which
gives access to ground truth for costs, timelines and value-chain realism that would
otherwise have to be researched at arm's length and would likely be wrong.
**Considered and rejected:** Kenya first — the largest published evidence base
(MbeleNaBiz) and the biggest market, but no comparable access to operational ground
truth. Building region-generic content first — rejected because vague content is what
makes these tools unconvincing to the people using them.
**Revisit if:** A pilot partner is secured in another country first.

## D-006 — Vanilla ES modules, no build step, no dependencies
**Date:** 2026-08-02 · **Decided by:** Project owner + Claude · **ADR:** [ADR-0006](../docs/adr/0006-no-build-vanilla-js.md)
**Decision:** Build the application as plain ES modules served as written, with no
bundler, transpiler or runtime dependencies. Scenarios are JSON.
**Why:** The whole app comes to ~33KB gzipped including content — less than a framework's
runtime alone, on a connection the learner pays for. The source being the artefact also
suits a project picked up intermittently by people who are not full-time developers.
**Considered and rejected:** React or Svelte on Vite — the conventional choice, better
once the UI is complex, rejected on payload and contributor friction. Vanilla plus a
bundler for minification — tempting and the most likely first change if size tightens,
rejected for now because the build step is the part that hurts intermittent
contributors. Scenarios as JS modules — rejected because it makes content executable,
puts it out of reach of non-programmers, and would let an author hand-write outcomes.
**Revisit if:** Manual DOM construction starts producing bugs rather than just verbosity,
or the payload budget requires minification — take the bundler before the framework.

## D-007 — Proof-of-concept scope
**Date:** 2026-08-02 · **Decided by:** Project owner + Claude · **ADR:** —
**Decision:** One scenario (16 turns, a Tanzanian food stall), English only, no service
worker, placeholder money figures shown behind an in-app banner.
**Why:** The owner asked for something to play and give feedback on. Breadth would have
delayed that without answering the question the prototype exists to answer — whether
this holds anyone's attention (Q-011).
**Considered and rejected:** Two scenarios up front, which would have enabled
far-transfer testing immediately — deferred because one playable scenario answers the
engagement question sooner, and transfer testing is worthless if nobody finishes the
first one. Real Tanzanian figures — deliberately not invented; the banner says so.
**Revisit if:** Playtesting shows 16 turns is the wrong length (Q-013), or a second
scenario is needed to answer a question the first cannot.

## D-008 — Completion, not performance, is the gate
**Date:** 2026-08-04 · **Decided by:** Project owner · **ADR:** [ADR-0005](../docs/adr/0005-simulator-as-stage-zero-gate.md) (now `Accepted`)
**Decision:** Finishing a playthrough is what carries a learner into the funnel. Prediction
accuracy is recorded and travels with them, but no threshold is applied and nobody is
excluded for playing badly. Closes [Q-012](./OPEN_QUESTIONS.md) and the remainder of Q-009.
**Why:** The owner had earlier described passing on people who "get all of the questions
right". Asked directly, with the fairness cost made explicit, they chose completion. A
performance gate would place real consequence on an instrument with no validated predictive
signal (Q-003), and would most likely filter on digital fluency — excluding the experienced
operator the project's own thesis says is most undervalued.
**Considered and rejected:** A performance gate, which is simpler to explain to a partner
and is what most programmes would ask for — rejected on fairness and validity. A neutral
end screen deferring the question again — rejected because the ending had to say something,
and leaving it vague would have meant deciding by drift.
**Revisit if:** Q-003 resolves positively and the record earns predictive standing, or a
partner cannot run a funnel wide enough to admit everyone who finishes.

## D-009 — Bilingual content lives inline, key-major
**Date:** 2026-08-04 · **Decided by:** Claude, with the owner's instruction to add Kiswahili · **ADR:** —
**Decision:** Every localisable string carries its languages together — `{ "en": …, "sw": … }`
in scenario content, and `"key": { "en": …, "sw": … }` in `app/content/ui.json`. One file per
concern, not one file per language. `scripts/validate-i18n.mjs` enforces parity.
**Why:** Parallel per-language files drift silently, and the drift is invisible to whoever
does not read both languages — which is everyone on this project for Swahili. Key-major also
puts the two languages adjacent for a reviewer, which is exactly what the owner's Tanzanian
teams need in order to check register.
**Considered and rejected:** Separate `scenario.sw.json` / `ui.sw.json` — the conventional
layout and easier to hand to a translation service, rejected because nothing would catch a
missed string. Gettext-style tooling — rejected under ADR-0006, it needs a build step.
**Revisit if:** A third or fourth language lands and the inline objects get unwieldy, or a
translation vendor requires standard interchange files.

## D-010 — Demand is mean-reverting; hygiene has a floor
**Date:** 2026-08-04 · **Decided by:** Claude · **ADR:** —
**Decision:** Weekly drift moves demand a fraction of the way towards a level implied by
reputation, instead of adding `(reputation − 50) × 0.6` every week. Authored demand changes
move that baseline, which is floored at 25% of the scenario's opening demand. Hygiene slips
only down to 40; below that takes active neglect.
**Why:** The old rule compounded without limit. Over a 20-turn run a middling reputation
drove demand to zero and it could never recover — every remaining turn then happened in a
dead business, where every option produces the same nil result and the learner is choosing
between three identical outcomes. It was invisible at 16 turns and with less drift, and no
existing check would have caught it, because `validate-scenario.mjs` tests band *stability*,
not whether the business is still alive.
**Considered and rejected:** Softening the content's demand penalties alone — treats the
symptom and leaves the trap for the next author. A bankruptcy or game-over state — rejected
because `docs/game-design.md` makes failure a chapter boundary, not an ending.
**Revisit if:** Playtesting shows the floor makes neglect feel consequence-free, or a
scenario needs a business that genuinely can fail outright.

## D-011 — The learner supplies numbers; content declares response curves
**Date:** 2026-08-05 · **Decided by:** Project owner · **ADR:** —
**Decision:** Decisions where a number is the real choice — price, hours, staff, discount,
how to split profit — are made by the learner setting the value, not by picking one of
three. Content expresses how that value moves the rest of the business through
**declarative response curves** (`{ field, perStep, change }`), never formulas.
**Why:** The owner played v2 and said it was "the same game as the original with just some
additional UI portions". That was accurate: v2 changed the model underneath but not what
the learner does. Depth comes from what the learner does, not what they are shown. It also
matters for the selection signal — a free decision is far stronger evidence of execution
than choosing from a list somebody else wrote (ADR-0004), and the chosen value is now
recorded. Response curves rather than expressions keep scenarios data, reviewable by
someone who does not program (ADR-0006).
**Considered and rejected:** A small expression language in content — more flexible, and it
would have made content executable, put it out of reach of non-programmers and let an
author hand-write outcomes. Free text or typed entry — rejected on the device constraint;
steppers only, no typing. Converting every turn — some decisions are genuinely categorical
(register or not, which supplier) and forcing them into a number would be false precision.
**Revisit if:** Playtesting shows steppers are slower or more confusing than choices on a
real low-end phone, or a scenario needs a relationship that is not usefully linear.

## D-012 — Numeric predictions are graded close / near / off
**Date:** 2026-08-05 · **Decided by:** Claude · **ADR:** —
**Decision:** On a free decision the learner predicts an actual weekly profit figure rather
than a direction band. Error is relative, with a floor so small profits are not judged
harshly: `|predicted − actual| / max(2000, |actual|)`. Within 10% is *close* and counts as
correct; within 25% is *near*; beyond that is *off*.
**Why:** Direction bands were the weakest part of the assessment — four buckets, so a guess
is right a quarter of the time, and the boundary was invisible to the learner (Q-014). A
figure is a far more informative claim. Three grades rather than pass/fail because on a
free-input prediction almost nobody is exact, and treating near misses as failures would
make the mechanic feel arbitrary and punish precision.
**Considered and rejected:** Exact match — absurd. A raw percentage error shown to the
learner — precise, and `docs/localization.md` is clear that percentages read less reliably
than plain language for this audience. Keeping bands everywhere — simpler, but it wastes
the richer answer a free decision makes possible.
**Revisit if:** Playtesting shows learners cannot estimate a figure at all, in which case
anchor the stepper harder rather than returning to bands.

## D-013 — A goal spans the run, and is reported but never scored
**Date:** 2026-08-05 · **Decided by:** Project owner · **ADR:** —
**Decision:** The scenario carries a goal with testable conditions, shown throughout and
evaluated at the end. It is recorded as an **observation** of what was true when the run
finished. It is not a pass mark, and completion remains the gate (D-008).
**Why:** Twenty independent decisions do not add up to a business. A goal is what makes them
one campaign and gives the learner something to steer by. The risk is obvious — a goal is
one short step from a performance gate, which Q-012 has just been settled against — so the
separation is deliberate and stated in the goal's own text.
**Considered and rejected:** No goal at all, which is what v2 had and is why the run felt
like a quiz. A goal that gates the ending — reintroduces the performance gate by the back
door, days after deciding against it.
**Revisit if:** Facilitators start reading goal progress as a score anyway, which would mean
the wording is not doing enough work.

## D-014 — Insolvency sheds what cannot be funded
**Date:** 2026-08-05 · **Decided by:** Claude · **ADR:** —
**Decision:** When cash is below zero, weekly costs fall — rent above the business's opening
overhead comes off, staff who cannot be paid go, capacity shrinks — down to a floor that
leaves a stall-sized business. Costs are also floored at zero so content can never drive
them negative.
**Why:** Fixed costs compounded forever. A learner who bought everything on credit kept
paying rent on equipment that would long since have been repossessed, and cash reached
about −900,000, which makes the ledger read as broken rather than as a business in trouble.
Shedding what you cannot fund is both what actually happens and what bounds the spiral,
because costs fall as the business shrinks. Separately, repeated cut-backs in the recovery
chapter could take rent negative — the business being *paid* to exist.
**Considered and rejected:** Raising the recovery cap — measured, and it did not help; the
hole still reached −600,000, so recovery frequency was never the cause. A bankruptcy or
game-over state — `docs/game-design.md` makes failure a chapter boundary, and D-008 requires
that everyone can finish. Tuning the content's costs down — treats the symptom and leaves
the trap for the next author.
**Revisit if:** Playtesting shows the shedding makes overspending feel consequence-free.

## D-015 — Every control must be able to reach the answer
**Date:** 2026-08-06 · **Decided by:** Claude, after owner playtesting · **ADR:** —
**Decision:** Two rules, both now enforced by `validate-scenario.mjs`:
1. A numeric input that starts from the current value must **include that value in its
   range**. The learner has to be able to leave a number where it is.
2. A numeric prediction's stepper must be able to **reach every profit the turn's decision
   could produce**. `predictionWindow()` sizes it from the whole decision space — every
   value of a number input, every option of a choice — so the range says nothing about
   which outcome is coming. The step is a round number, roughly a twentieth of the window,
   and `gradePrediction()` takes that step as its tolerance floor: landing on the nearest
   value the control can reach must be gradeable as *close*.
**Why:** The owner played the build and reported "I couldn't change the prices on the
mandazi" and that estimating earnings was too hard. Both were the app's fault, not theirs.
The price stepper opened at 575 with the price at 500, so it sat pinned at its own minimum
and the two minus buttons did nothing. And the prediction window was a fixed ±10 steps of
1,000, while the first turn's true answer was +10,525 away — outside it. A learner who
reasoned perfectly was graded *off*, and could not have done otherwise, at three of the
six numeric predictions. This is worse than a cosmetic bug: the record is a behavioural
instrument, and it was recording the control's limits as the learner's calibration.
**Considered and rejected:** Widening the price range downward to 400 as well — measured,
and it makes the always-cheapest path insolvent early enough that four later option bands
flip from *down* to *same*, because D-014 sheds costs the business cannot fund. The floor
is therefore the starting price; cutting price below where you start is not offered. Scaling
the prediction window from the actual outcome — simpler, but the window's width would then
leak the size of the answer. Loosening the grade thresholds instead — hides an unanswerable
question behind a kinder mark.
**Revisit if:** A scenario needs a price cut as a real strategic option, which means
revisiting how option bands are declared on an insolvent path.

---

## D-016 — Four chapters, bounded starts, six carried flags
**Date:** 2026-08-08 · **Decided by:** Project owner, in session · **ADR:** [ADR-0007](../docs/adr/0007-four-chapter-arc.md)
**Decision:** The simulator becomes four chapters following one character — mandazi stall
(exists), bakery, factory, export. Each is a **self-contained 20-turn playthrough with an
authored `startState`**, playable alone and in any order. What travels between chapters is
narrative plus a **closed set of six flags** — `keepsRecords`, `formality`, `tookCredit`,
`builtTeam`, `heldStandard`, `concentrated`. Flags tint opening narrative and at most two
turns per chapter; they never gate, never make a chapter unplayable, and are never summed.
Full design in [`docs/arc.md`](../docs/arc.md).
**Why:** A stall cannot teach the capabilities `AGENTS.md` §2 actually commits us to —
financing an asset, working capital, delegation with authority, meeting someone else's
standard — because a stall is never destroyed by neglecting them. The owner chose the
hybrid explicitly over both full state carry-forward and no carry at all.
**Considered and rejected:** Full carry-forward — the more satisfying design, and it loses
the fixed opening state that `validate-scenario.mjs` walks from and that prediction windows
(D-015) are sized against. No carry at all — cheapest, survives every check, and throws away
the one thing chapters uniquely offer over four unrelated scenarios. One 60-turn scenario —
a mandazi stall does not appraise capex or export, and forcing it to would teach each
concept in a setting where the learner can see it does not belong.
**Revisit if:** Any chapter needs a seventh flag twice. That is the closed set being the
wrong abstraction rather than a tight one.

---

## D-017 — Advanced concepts go in the engine, not in new controls
**Date:** 2026-08-08 · **Decided by:** Project owner, in session · **ADR:** [ADR-0007](../docs/adr/0007-four-chapter-arc.md)
**Decision:** Chapters 2–4 add no new decision types. Everything is expressed with the four
that exist — choice, number, allocate, diagnose — and the depth arrives as **new mechanics
in the engine that surface as lines in the ledger the learner already reads**: product mix
(`lines[]`), depreciation, debt and interest, working capital (`debtorWeeks`,
`creditorWeeks`, `inventoryWeeks`), FX, and landed cost. The `workout` phase becomes
**opt-in per turn**, required only where a numeric profit prediction is asked.
The load-bearing change: `advanceWeek` moves from `cash += profit` to `cash += cashFlow`,
which are **equal by construction** when every new field is at its default. Chapter 1 is
therefore unchanged, and `test-engine.mjs` asserts it.
**Why:** The owner asked for a simpler interaction and deeper content. Working capital is
better taught by cash and profit visibly diverging in a panel the learner already knows how
to read than by a working-capital widget — which is also how the concept presents in a real
business. And every new control type is a new way for a control to be unable to reach its
own answer (D-015); session 007 shipped exactly that failure.
**Considered and rejected:** Purpose-built controls per concept — loses against the
mobile-first constraint (`AGENTS.md` §3) and against D-015's evidence. Narrating the
concepts in outcome text without modelling them — cheapest by far, and it makes the
scenario a story to memorise rather than a system to reason about, which the engine's
opening comment exists to forbid.
**Revisit if:** A concept in `docs/arc.md` cannot be made to produce a legible consequence
in the ledger. Narrating it is then the honest fallback, and it should be labelled as
narration rather than passed off as modelled.

---

## D-018 — Prediction band edges are per chapter, and each chapter must choose its own
**Date:** 2026-08-08 (session 010) · **Decided by:** Claude, from evidence
**Decision:** `BAND_SAME` and `BAND_LOT` — the boundaries between "goes down", "about the
same", "up a little" and "up a lot" — move from engine constants to a top-level `bands` key
on the scenario, read by `main.js` and by `validate-scenario.mjs`. The engine's defaults
stay at the stall's 1,500 / 12,000, so chapter 1 is untouched and asserted so. Every
chapter from 2 onward **must** author its own edges, chosen from the actual spread of its
option deltas.
**Why:** Session 009 measured it. With the stall's edges, "up a lot" was reachable by one
option in forty-two in chapter 1, and "up a little" by two in forty-five in the bakery.
Both chapters offered the learner a four-way prediction that behaved as a three-way one,
and a *different* three each time. Prediction accuracy is the signal the whole assessment
rests on ([Q-014](./OPEN_QUESTIONS.md)), so a band nobody can land in is not a cosmetic
problem — it is a measurement being taken with a broken instrument.
**How the bakery's were chosen**, because the method is the reusable part: dump every
option's delta from `validate-scenario.mjs`, sort them, and pick edges that fall in the
*gaps* between clusters. Edges landing inside a cluster make an option's band depend on
which path the learner took to reach the turn, which the validator then rejects as
unstable — correctly. The bakery's deltas cluster tightly enough that only one pair worked:
`{ same: 2000, lot: 21200 }`. That makes "about the same" mean the do-nothing options and
almost nothing else, which reads honestly on a business earning ~300,000 a week.
**Considered and rejected:** Deriving edges from opening weekly profit. Tempting, needs no
authoring, and it produces unstable bands — the right edge depends on how the *content's*
outcomes cluster, not on the size of the business.

## D-019 — A chapter must be finishable by a learner who reads the warnings
**Date:** 2026-08-08 (session 010) · **Decided by:** Claude, from evidence
**Decision:** `simulate-runs.mjs` gains a fifth simulated player, `attentive`, and its
ending is a **FAIL** where the other four only warn. It picks, at every turn, the option
leaving the business best off four weeks later, judged on exactly what the app already puts
on screen: weekly profit, what reaches the bank, the reputation and hygiene meters, and the
health warnings. It plans no further than four weeks and remembers nothing.
**Why:** Session 009 found that all four existing strategies ended loss-making or insolvent
in both authored chapters, and could not say whether that was a balance problem or an
artefact of crude strategies — "always take the first option" is closer to not engaging
than to playing carefully. Nothing in the repository could answer "can this chapter be
finished well at all?", which is the direct form of the owner's question about whether
people will play it through.
**What it must not be:** a profit maximiser. One was tried first. It ran chapter 1 to 1.4m
in the bank by turn 16 and then collapsed to a 90,000-a-week loss with reputation at zero —
which is not a balance failure, it is the lesson, and requiring myopic greed to succeed
would forbid this project from teaching the thing it exists to teach. The floor a chapter
must clear is a learner who *heeds the feedback they are given*, not one who ignores it.
**Result:** chapter 1 finishes at 2.24m cash and 2/3 goal conditions; the bakery at 8.3m
and 3/3. Neither did before.
**Revisit if:** Tuning `HEALTH_PENALTY` or `METER_WEIGHT` becomes the routine way to make a
chapter pass. That would mean the probe is being fitted to the content instead of measuring
it, and the honest response is to write the strategy the content actually needs and say so.

## D-020 — The end of a chapter recaps the concepts, not the performance
**Date:** 2026-08-08 (session 010) · **Decided by:** Claude
**Decision:** The end-of-chapter screen lists every concept the chapter taught, in order,
each with the decision the learner made against it. No tick, no cross, no ordering by
outcome.
**Why:** Every turn already carries a `conceptLabel`, shown as a tag for about a minute and
then never again. Twenty of those go past in half an hour, and a learner finishes able to
say what happened but not what it was teaching. This is the only place the whole list is
visible at once, and it costs nothing to author because the labels already exist.
**Why it carries no marks:** ADR-0004 and D-008. A recap that ranked the learner's
decisions would be a score on the screen that most needs not to have one, and this is
exactly where one would grow. `smoke-app.mjs` asserts it does not.

---

## D-021 — A control anchors on a value that exists, and the checks prove it
**Date:** 2026-08-08 (session 011) · **Decided by:** Claude, from evidence
**Decision:** `engine.js` gains `readField(state, field)`, which reads a flat field or a
product line addressed as `lines.<id>.<field>`. Everything that asks "where is the learner
now?" goes through it — the `start: "current"` anchor in `resolveNumberInput`, the stepper's
opening position and the response feedback in `ui.js`, and the monotonicity check in
`validate-scenario.mjs`. The validator now **FAILs** a number input whose field is not a
real state field, or whose `start: "current"` has no current value to anchor on.
**Why:** `state['lines.export.price']` is `undefined`, because lines live in an array. Every
caller used a plain index and silently got zero, so a response curve authored as "for every
50 shillings you move the price" was measured from **zero** instead of from the price. Two
live examples, both authored correctly and both broken by the engine: chapter 4's export
pricing turn cost the learner **34–50 reputation for naming any price at all**, and chapter
3's competitive pricing turn wiped roughly **2,000 loaves of weekly demand for holding its
own price steady**. Both were recorded as the learner's judgement.
**Why the checks did not see it:** a curve measured from the wrong anchor is still finite,
still maps to a band, and is still monotonic — which is everything `validate-scenario.mjs`
asked. It is the same lesson as [D-015](#d-015--every-control-must-be-able-to-reach-the-answer):
the checks test the model and say almost nothing about the controls, so a control defect has
to be made into a check of its own or it will not be found.
**Considered and rejected:** leaving the two turns anchored on authored constants, which is
what the fix looked like before the cause was understood. It works until an earlier turn
moves the same price — chapter 4 has one that does — and it leaves the defect armed for the
next author who writes the obvious thing.
**Revisit if:** a third address space appears. Two (flat fields, line paths) is a helper;
three is a path resolver, and the honest response then is to store lines as a map.

## D-022 — An effect that must survive every path moves the whole constraint, and is signed
**Date:** 2026-08-08 (session 011) · **Decided by:** Claude, from evidence
**Decision:** Two authoring rules, applied to chapters 3 and 4 and binding on new content:
1. **An option that changes the order book moves `demand` and `capacity` together.**
2. **Use a signed delta (`"+60"`, `"-0.045"`) for any field an earlier turn can also move.**
   An unsigned number is an absolute set, and it means "whatever the author assumed the
   state was", which is a different thing on every path.
**Why:** thirteen of the nineteen prediction failures in chapters 3 and 4 were one of these
two shapes. Demand alone does nothing when the business is already capacity-constrained and
raises spoilage when it is not, so the *sign* of the outcome depended on which side of the
constraint an earlier decision had left the firm — the option was graded differently for
identical reasoning. The unsigned form was worse: chapter 4 set an export price of 60
shillings where it meant to add 60, and set a duty rate that was a *cut* on one path and an
*increase* on another, so the declared answer was wrong for the learner who was right.
**Also recorded, because it cost an afternoon:** `spoilRate` charges **unsold capacity
only**. It is not a model of transit damage or of anything that happens to goods that
actually ship. Chapter 4's packaging turn was using it for both, which made a decision about
sea freight quietly depend on how much stock went unsold at home.
**Considered and rejected:** widening the band edges until the unstable options fit inside
one band. It passes the validator, and it makes the prediction meaningless in exactly the
turns where the business is most exposed.
**Revisit if:** an author needs an option that genuinely can go either way. That is a real
thing in business, but it cannot be graded as a prediction — put the consequence in `later`,
where it is attributed rather than scored.

## D-023 — Every figure on screen is one the business has, and every column adds up
**Date:** 2026-08-08 (session 012) · **Decided by:** Claude, from evidence
**Decision:** Two rules, and a check that enforces them. A card may only state a figure the
business actually produces — a price it charges, a cost it pays, a margin it earns — and any
column of figures shown with a total under it must reach that total.
`scripts/playthrough.mjs` plays every chapter to the end in both languages and asserts both,
along with: no broken value, no unfilled placeholder, no untranslated key, no dead control
and no screen without a way forward.
**Why:** `createState` leaves the flat `price` and `unitCost` at the engine's defaults when a
chapter authors product lines, because nothing in the engine reads them. The interface did.
Every work-it-out card in chapters 2, 3 and 4 told the learner they were selling at **TZS 500
and keeping 200** — chapter 1's mandazi, in a bakery selling bread at 1,200 — beside a
revenue figure computed from the real lines. A learner following the instruction on the card
and multiplying the two numbers got a third number that was not on the card. The numeric
prediction card repeated the same fiction. Separately, spoilage, freight, duty and currency
were left out of the workout column in every chapter including the first, so the rows did not
reach the total whenever any of them was live.
**Why the existing checks did not see it:** every one of them tests the model.
`validate-scenario.mjs` reads content and the engine; `test-engine.mjs` reads the engine;
`smoke-app.mjs` renders a handful of screens and checks the wiring holds. Nothing read a
screen and asked whether what it said was true. This is [D-021](#d-021--a-control-anchors-on-a-value-that-exists-and-the-checks-prove-it)
and [D-015](#d-015--every-control-must-be-able-to-reach-the-answer) for a third time — the
controls keep being where the defects are, and the checks keep being somewhere else.
**Also fixed under the same rule:** chapter 4 authors `valueAs: "currency"` on its two price
steppers, which `decisionValue` did not recognise, so the control read "1,700" and the
work-it-out card one screen later read "TZS 1,700" for the same number. Count is now the
exception and money the default, matching `decisionLabel`.
**Considered and rejected:** deriving `price` and `unitCost` from the lines inside
`createState`, so the old code would have found something true there. A weighted average
price is not a price anyone charges, and the card would have gone on claiming a unit
economics that does not exist — a plausible wrong number is worse than an obvious one.
**Revisit if:** a card needs to show a figure the engine cannot produce. That is the signal
the engine is missing a concept, not that the rule is too strict.

## D-024 — A diagnose step reads three kinds of evidence, and evidence with no figure says so
**Date:** 2026-08-08 (session 012) · **Decided by:** Claude, from evidence
**Decision:** `renderDiagnose` resolves an option against the P&L rows, the cash statement
(`cash.profit`, `cash.depreciation`, `cash.repayment`, `cash.workingCapitalChange`), or an
authored object carrying its own label — for evidence the engine has no line for, such as a
step of a production process. An authored option shows its label and an optional detail
string and **no money figure at all**. `validate-scenario.mjs` fails any option that is
neither a line the app can price nor an object with a label in both languages, and reads the
list of priceable lines out of `ui.js` so it cannot drift.
**Why:** the control assumed every option was a P&L row, and three of the five diagnose steps
in the four chapters are not. The bakery and the export chapter ask which line explains why
profit did not reach the bank — a cash question — and the factory asks which step of the
floor is capping output, which has no figure. An option the lookup missed rendered as the raw
key with **"TZS 0"** beside it: `cash.workingCapitalChange` and `mixing` appeared on screen in
those words, and in two of the three chapters that included the correct answer. The learner
was asked to read the evidence and shown none.
**Why this is the right shape and not three controls:** the skill is one skill — read what is
in front of you and name the cause — and [ADR-0007](../docs/adr/0007-four-chapter-arc.md) and
[D-017](#d-017--advanced-concepts-go-in-the-engine-not-in-new-controls) both say depth arrives
without new widgets. Three authors reached past this control in three chapters, which says
the abstraction was too narrow, not that they were wrong to reach.
**Revisit if:** a fourth kind of evidence appears. Two engine-priced sources and one authored
escape hatch is a control; four is a rendering language, and the honest response then is to
let content supply the whole row.

## D-025 — A ledger line a stall does not have introduces itself, once
**Date:** 2026-08-08 (session 012) · **Decided by:** Claude, from the arc's own design
**Decision:** The money panel names and explains, in one sentence, any line beyond the five
every business here has from its first week (sales, cost of sales, rent, wages, licence fees).
It does so on the turn the line first appears and not again. A line only counts as introduced
if the panel was **open** when it was shown — the panel is collapsed until the learner asks
for it, and spending the one explanation on a turn where nobody could read it would be worse
than not having one.
**Why:** [`arc.md`](../docs/arc.md) §3 says the advanced concepts are taught "by cash and
profit visibly diverging in the panel the learner already reads, not by a working-capital
slider". That only works if the learner can read the panel. A row for depreciation simply
appeared, in a chapter where no text on screen used the word. Chapter 4 opens with five such
lines at once.
**What it produces:** 1 line introduced in chapter 1, 3 in chapter 2, 3 in chapter 3, 5 in
chapter 4 — the first mechanism in the app whose depth actually scales with the arc rather
than being flat across it.
**Considered and rejected:** explaining every line on the first turn of every chapter. It
puts five paragraphs above the first decision a learner ever makes, and it explains "rent" to
someone who pays rent.
**Revisit if:** the count on one chapter's opening turn gets much past five — see
[Q-025](./OPEN_QUESTIONS.md). The fix then is fewer words, not fewer explanations.

---

## Pending — proposed, not decided

Entries below are **not decisions.** They are recorded here so the index is complete and
so nobody has to hunt for them. Do not act on them as settled.

*(ADR-0005 was ratified on 2026-08-04 — see D-008 above. Nothing is currently pending.)*

Of the further proposals from
[session 002](./sessions/2026-08-02-002-pedagogy-and-timing-ideation.md),
**predict-then-reveal** is implemented and now shows the learner the money ranges each band
covers. **Far-transfer testing** and **pre/post plus delayed retest** remain unimplemented
and unratified. Both were blocked on a second scenario; as of session 011 there are four, so
what remains is a design and ratification question rather than a content one.
