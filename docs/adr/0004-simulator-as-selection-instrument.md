# ADR-0004 — Simulator as selection instrument, not business-plan trainer

**Status:** Accepted
**Date:** 2026-08-02
**Deciders:** Project owner
**Related:** [D-004](../../memory/DECISIONS.md), [Q-002](../../memory/OPEN_QUESTIONS.md), [Q-003](../../memory/OPEN_QUESTIONS.md), [`../assessment.md`](../assessment.md)

**This is the defining decision of the project.** Read it before proposing features.

## Context

The project exists as an "on-ramp for grant applications." There are two very different
things that phrase could mean, and they lead to opposite products.

**Reading A:** help applicants produce better applications — a guided business-plan
builder, pitch practice, application coaching.

**Reading B:** produce a better signal for the people selecting applicants — observe
what a candidate actually does and give programmes something more useful than a written
plan.

The project owner's background note
([`../context/transformational-entrepreneurship.md`](../context/transformational-entrepreneurship.md))
settles this. Its argument, in the part that bears directly here:

- Business-plan scores and judges' assessments **predict future firm performance
  poorly**, even in well-run competitions like Nigeria's YouWiN!, where plan scores
  failed to identify eventual winners.
- Other commonly-used signals are weaker still: youth, charisma, pitch quality, generic
  passion, hardship narratives, business degrees, promised job numbers, and grit
  questionnaires.
- What predicts better is **observed execution** — securing a paid trial or customer
  commitment, delivering a sample, establishing credible unit economics, recruiting a
  capable collaborator, keeping proper records, and responding intelligently when
  assumptions change.
- The recommended method is therefore: use founder traits to shape the initial pool,
  then **select on real commercial behaviour**, typically via a six-to-twelve-week
  execution test.

The practical obstacle to that method is cost. Running a real execution test per
candidate is expensive, so programmes fall back on written applications — the cheap
signal that does not work.

## Decision

**The simulator is a low-cost first-stage execution test.** Its primary output is a
**behavioural record**: what the learner did across many decisions, under what
information, and how they responded when assumptions broke.

We will not build a business-plan generator, a pitch trainer, or a personality
assessment as the product's output. If a plan-like artefact ever exists, it is a
by-product of play, clearly subordinate to the behavioural record.

Governing rules for what the record may claim are in
[`../assessment.md`](../assessment.md). The short version: report what was observed,
never a prediction.

## Consequences

**What this gets us.** A product aimed at the actual failure in the system rather than
at its symptom. Screening cost per candidate low enough that programmes can widen their
funnel instead of narrowing it — which is where the note says the undervalued candidates
are. And a defensible position: we are not adding another weakly-validated selection
signal dressed up as insight.

**What this costs us.** Adoption friction, and a lot of it. Many programmes will ask for
a plan builder, because that is what their process consumes today, and some will decline
to work with us when we say no ([Q-002](../../memory/OPEN_QUESTIONS.md) will tell us how
bad this is). A behavioural record is also harder to explain to a funder than a score,
and harder to build than a form.

It is also a harder engineering problem. A plan builder is a guided form. A simulation
that generates meaningful behavioural signal requires the decisions to be real, the
consequences to be true, and the whole thing to resist gaming.

**What it forecloses.** The fastest route to a demonstrable product. A plan builder
could ship in weeks and would look impressive. We are choosing the slower thing.

**What it obliges.** Having criticised others for overclaiming, we cannot claim
predictive validity we have not established. Until an external study exists
([Q-003](../../memory/OPEN_QUESTIONS.md)), this is a teaching tool that also produces
structured observations, and we say so in those words.

## Alternatives considered

**Business-plan builder as the headline output.** The obvious product. It is what the
phrase "on-ramp for grant applications" suggests on first reading, what most programmes
would ask for, and by far the cheapest to build. **Rejected on evidence.** It optimises
precisely the signal the note demonstrates does not work, and would make this tool part
of the selection failure it exists to address. Worse, it would appear successful —
better-looking applications are easy to observe — while changing nothing about who gets
funded well.

**Pitch training or presentation coaching.** Same failure mode, weaker evidence still.
Rejected for the same reason.

**Personality or trait assessment for founder selection.** Superficially attractive:
cheap, scalable, and there is a market for it. The note is explicit that generic
personality and grit instruments are weak indicators. Rejected.

**Teaching tool only, with no selection ambition.** Genuinely defensible, and it is
where we land anyway if [Q-003](../../memory/OPEN_QUESTIONS.md) resolves badly. Not
chosen as the goal because it leaves the expensive problem — selection cost — untouched,
and good teaching tools already exist. The design is nonetheless built so that this
remains a good outcome rather than a failure: see
[`../theory-of-change.md`](../theory-of-change.md), where the learning and selection
pathways are deliberately independent.

**Both: behavioural record plus a plan generator.** Tempting as a compromise for
adoption. Rejected as the primary framing because the two pull the product in opposite
directions — one rewards demonstrated behaviour, the other rewards articulation — and in
any conflict the plan builder would win, because it is easier and more legible to
partners. A plan-like artefact may still emerge as a by-product; it may not become the
point.

## Revisit if

- Partner programmes prove structurally unable to ingest a behavioural record and can
  only accept plan documents. **The correct response is to surface that conflict
  explicitly to the project owner, not to quietly resolve it in favour of the plan.**
- [Q-003](../../memory/OPEN_QUESTIONS.md) resolves negatively — in-simulation behaviour
  carries no useful signal, or tracks digital fluency more than business capability. The
  selection purpose then ends, and this ADR should be superseded by one that scopes the
  project to teaching.
- New evidence changes the picture on what predicts entrepreneurial performance.
