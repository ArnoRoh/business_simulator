# Session 002 — Pedagogy, engagement and programme placement

**Date:** 2026-08-02
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code)
**Branch:** `claude/business-simulator-repo-setup-lpe4ir`
**Duration / scope:** Discussion only. No design documents changed.

> **STATUS WARNING — read before acting on anything here.**
>
> Almost everything below is a **proposal from Claude, not a decision by the project
> owner.** The owner raised the questions and has not yet ruled on the answers.
> [ADR-0005](../../docs/adr/0005-simulator-as-stage-zero-gate.md) is deliberately in
> `Proposed` status for the same reason.
>
> Do not treat these as settled. Do not rewrite `docs/` around them until
> [Q-009](../OPEN_QUESTIONS.md) is answered.

---

## Goal

The owner opened an ideation discussion:

> "Now I want to ideate with you on how we can make this useful. So it should be
> pedagogical and teach genuinely useful skills (accounting, customer management,
> operations, etc.) whilst at the same time be engaging and fun for people and actually
> be able to test that they learnt things. I'm undecided if this is a pre requisite for
> the grant program or something that happens during."

Three requirements plus one open choice: real skills, engaging, verifiable learning —
and where it sits relative to the grant programme.

## What happened

Discussion only. Nothing in `docs/` was modified, deliberately — the repo's convention
is that docs describe what is true about the design, and none of this is agreed yet
(`AGENTS.md` §5). The reasoning is captured here and in a `Proposed` ADR instead.

## Discussion

### Placement: prerequisite vs. during

**Claude's recommendation: prerequisite, but as a low-stakes *completion* gate rather
than a performance gate.** Full reasoning in
[ADR-0005](../../docs/adr/0005-simulator-as-stage-zero-gate.md); summarised here.

The argument turns on something already in the owner's background note: the funding
model it advocates is **staged** — hundreds of ~$500 discovery experiments, fewer
~$2,500 paid trials, ~20 ~$10k first batches, a handful of ~$25k scale packages. That
means there is no single selection moment. So the question is not "before or during" but
**which stage the simulator gates**.

Proposed answer: the simulator is **stage 0** — it decides who gets a ~$500 discovery
experiment, the cheapest thing in the portfolio.

Why that placement helps:

- **Gaming pressure is proportional to stakes.** Nobody organises to cheat their way to
  $500. The same instrument in front of a $25k decision would be attacked hard.
- **The fairness exposure in `docs/assessment.md` largely dissolves.** Nobody is denied
  funding on an unvalidated instrument; they enter the funnel at the same point as
  everyone else. This matters most for the Joseph persona — the experienced operator
  with low screen fluency, who the note says is among the best candidates and who a
  performance gate would filter out first.
- **It widens the funnel rather than narrowing it**, which is the only reason cheap
  screening is worth having.
- **It generates the Q-003 validation data as a by-product.** Simulator behaviour → who
  received a discovery experiment → who then succeeded at a paid trial. That is the
  correlation nobody has run, and it would make the project fundable as a research
  instrument rather than only as training.

The **completion-as-gate** distinction is the load-bearing part: finishing is a low bar
that mostly filters for willingness to do unpaid work on spec — itself a mild signal of
seriousness, and less confounded by digital fluency than performance would be. The
behavioural record then informs the *next* stage transition, by which point there is also
real execution to look at.

The tool should **also continue during the programme** as scaffolding while a participant
runs a real experiment — but that version carries no assessment stakes at all.

**Considered and set aside:**

- **During-only.** Clean teaching, no gaming incentive, no consent or fairness exposure.
  Set aside because it discards the selection purpose, which is the project's
  differentiator — and, as the note observes, good teaching tools already exist.
- **Prerequisite as a performance gate.** The obvious reading of "on-ramp". Set aside on
  fairness: it excludes exactly the candidates the thesis says to favour, and it puts
  maximum gaming pressure on an instrument with no validated signal.

### On "fun"

Claude pushed back on the framing. Tycoon-style fun comes from tight feedback loops,
escalating power and a legible optimisable system. Real business has long lags, ambiguity
and no win condition. **Building the former teaches that business is a solvable
optimisation problem, which is false**, and would produce something engaging and
pedagogically wrong.

Proposed reframe from *fun* to *compelling*, resting on:

- **Recognition** — "this is my actual problem." The strongest motivator for adult
  learners here, and the reason the honey ground truth matters more than any mechanic.
- **Consequence with no undo** — tension rather than amusement.
- **People, not spreadsheets** — named suppliers, a worker of uncertain reliability, the
  buyer who always pays at 60 days. Relationships with memory make abstractions felt.
- **Being right** — which led to the mechanic below.

### Predict-then-reveal

The single strongest idea from the session. Before committing to a decision, the learner
states what they expect to happen. Then it happens.

It is valuable because it is **simultaneously the engagement mechanic and the assessment
instrument**. The predicted-vs-actual gap is the learning moment; calibration improving
over time is a measure of learning that is hard to fake, because you cannot become
well-calibrated about a system without understanding it.

It also matches the note's strongest execution indicator — responding intelligently when
assumptions change — by putting the assumption on record, in the learner's own words,
*before* it broke.

### Teaching the named skills without teaching them directly

**Accounting.** Do not show a P&L until the learner needs one. Start the business simple
enough to track mentally, then grow it until they genuinely cannot answer "which of my
three products actually makes money?" without records. The felt confusion is the teaching
moment; introducing bookkeeping earlier is what makes it inert. Make record-keeping
**optional and costly in time** — if it was skipped, the information is simply not
available later. The product-profitability reveal (one line has been losing money all
along) is both the lesson and the emotional beat, and it is among the most common real
errors in the segment.

**Customer management.** Concentration risk cannot be lectured. Give the learner a buyer
worth ~60% of revenue and let them experience that buyer going quiet.

**Operations.** Model the founder's time as an explicit scarce resource, so that every
task done personally is visibly time not spent on what only they can do. Delegation stops
being advice and becomes arithmetic.

### Testing that learning happened

Three distinct things get conflated, needing different instruments:

1. **Knowledge** — do they know what gross margin is? Cheap, gameable, near-worthless.
2. **Transfer** — can they apply it somewhere unfamiliar?
3. **Behaviour change** — do they do it in their real business?

The standard failure is measuring (1) and claiming (3).

Proposed instruments:

- **Far transfer.** Teach cash-flow timing in the honey business, then test it in a
  transport business or a workshop. Solving it only in the taught context means a pattern
  was memorised; solving it in an unfamiliar one means something was learned. Cheap here,
  because scenarios are authored as data.
- **Pre/post on the same novel scenario.** A per-learner delta is far more defensible than
  an absolute score, and it controls for wildly different starting knowledge across a
  cohort spanning Joseph to Amina.
- **Delayed retest at ~4 weeks.** Retention is the real test. Most tools never do this
  because the results are unflattering.

### The tension the owner will hit

Measuring learning and generating a selection signal **interfere with each other**. Tell
people they are being assessed and they perform, corrupting the learning measurement.
Don't tell them, and selection use becomes a consent problem — which `SECURITY.md`
already forbids.

Proposed resolution: **full transparency, accept the performance effect, and rely on
instruments robust to it.** Transfer tests and calibration are much harder to fake than
knowledge tests — someone performing for an assessor still has to understand the system
to predict it accurately. Recorded as [Q-010](../OPEN_QUESTIONS.md).

### Knock-on effects on existing open questions

- **[Q-004] (playthrough length)** — partly answered by implication. Pre/post plus a
  four-week delayed retest requires a multi-session engagement, not a 30-minute tutorial.
  Not closed, because it depends on Q-009.
- **[Q-002] (which programme)** — becomes *more* urgent under this design, not less. A
  stage-0 gate only exists if there is a stage 1 to gate into.

## Decisions made

**None.** All of the above are proposals awaiting the owner's ruling. See
[Q-009](../OPEN_QUESTIONS.md) and ADR-0005 (`Proposed`).

The only thing settled this session was process: the repository scaffold from session
001 was merged to `main` at the owner's instruction, with this session's record included
in the same branch rather than a separate one.

## Questions raised or resolved

Raised: **Q-009** (confirm or reject the stage-0 placement — blocking),
**Q-010** (how to handle assessment/selection interference in practice),
**Q-011** (does "compelling rather than fun" actually retain learners — needs testing,
not argument).

Updated: **Q-002** (more urgent under the proposed design), **Q-004** (partly answered by
implication, not closed).

Resolved: none.

## State at end of session

No design documents changed. Added: this entry, ADR-0005 in `Proposed` status, three new
open questions, and updates to two existing ones.

The scaffold and this record were merged to `main`.

## Next steps

1. **Owner rules on Q-009.** Everything else in this session is downstream of it. If the
   stage-0 placement is accepted, ADR-0005 moves to `Accepted` and `docs/game-design.md`,
   `docs/assessment.md` and `docs/curriculum.md` all need revision to match.
2. If accepted, **Q-002 becomes the critical path** — the design requires a real stage 1.
3. Predict-then-reveal is largely independent of the placement question and could be
   developed into `docs/game-design.md` sooner, if the owner endorses it separately.
4. Develop one scenario concretely enough to test whether these mechanics hold up — honey
   remains the candidate ([Q-005](../OPEN_QUESTIONS.md)).

## Notes for the next contributor

- **Do not mistake this session for settled design.** It is a good conversation, not a
  ruling. The owner asked to ideate and has not yet chosen.
- The stage-0 argument is derived from the owner's own background note (the staged
  portfolio model in §9). If you disagree with it, argue from that note rather than from
  general product intuition.
- Predict-then-reveal is the idea most worth protecting if the design gets cut down. It
  is the only mechanic identified so far that serves engagement and measurement at the
  same time.
