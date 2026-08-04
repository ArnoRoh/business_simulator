# ADR-0005 — Simulator as a stage-zero completion gate

**Status:** **Accepted** — 2026-08-04.
**Date:** 2026-08-02 · **Accepted:** 2026-08-04
**Deciders:** Project owner
**Related:** [ADR-0004](./0004-simulator-as-selection-instrument.md), [Q-002](../../memory/OPEN_QUESTIONS.md), [Q-003](../../memory/OPEN_QUESTIONS.md), [Q-004](../../memory/OPEN_QUESTIONS.md), [session 002](../../memory/sessions/2026-08-02-002-pedagogy-and-timing-ideation.md), [session 005](../../memory/sessions/2026-08-04-005-depth-numbers-and-swahili.md)

> **Accepted in full on 2026-08-04**, including the part that was in doubt. In
> [session 003](../../memory/sessions/2026-08-02-003-playable-proof-of-concept.md) the
> owner described passing on people who "get all of the questions right", which is a
> *performance* gate and the opposite of item 1 below. That divergence was raised as
> [Q-012](../../memory/OPEN_QUESTIONS.md) rather than resolved quietly. Asked directly in
> session 005, with the fairness cost stated, the owner chose the **completion gate**.
> Q-012 is closed and the app implements it: the end-of-run screen says plainly that
> finishing is what carries you forward, and no threshold is applied to prediction
> accuracy.

## Context

[ADR-0004](./0004-simulator-as-selection-instrument.md) established *what* the simulator
produces: a behavioural record intended as a cheap first-stage execution test. It did not
establish *where in a programme's lifecycle the learner plays it*.

The project owner raised the question directly and is undecided between:

- **Prerequisite** — play before applying; the record informs selection.
- **During** — play as part of training, after selection.

The two readings produce different products. A prerequisite carries assessment stakes,
gaming pressure, consent obligations and fairness exposure. A during-programme tool
carries none of those, and also delivers none of the selection value that distinguishes
this project from training tools that already exist.

Two constraints already recorded bear on this:

- `docs/assessment.md` ("Fairness") warns that the most likely harm is measuring digital
  fluency and calling it business capability — which would disadvantage exactly the
  experienced operators the project's thesis says to favour (the Joseph persona).
- [Q-003](../../memory/OPEN_QUESTIONS.md) records that we have **no evidence**
  in-simulation behaviour predicts real firm performance.

Putting an unvalidated instrument in front of a consequential funding decision would be
the precise failure the project exists to criticise.

## Decision (proposed)

Reframe the question. The owner's background note advocates a **staged** funding model —
many ~$500 discovery experiments, fewer ~$2,500 paid trials, ~20 ~$10k first commercial
batches, a handful of ~$25k scale-preparation packages. There is therefore no single
selection moment, and the real question is **which stage the simulator gates**.

Proposed: **the simulator is stage zero.** It gates entry to the cheapest thing in the
portfolio — a ~$500 discovery experiment.

Two further properties, which carry most of the weight:

1. **Completion is the gate, not performance.** Finishing a playthrough qualifies a
   candidate for stage 1 consideration. A learner is never excluded for playing badly.
2. **The behavioural record informs the *next* stage transition, not this one** — by
   which point the programme has also observed real execution alongside it.

The same tool continues to be available **during** the programme as scaffolding while a
participant runs a real experiment. That mode carries no assessment stakes.

## Consequences

**What this gets us.**

Gaming pressure scales with stakes, and at ~$500 it is low. The same instrument in front
of a $25k decision would be attacked hard and would deserve to be.

The fairness exposure largely dissolves. Nobody is denied funding on the strength of an
unvalidated instrument; a weak performer enters the funnel at the same point as everyone
else. Completion is a materially less digital-fluency-confounded signal than performance,
though not free of it.

It widens the funnel instead of narrowing it — the only reason cheap screening is worth
having, and the mechanism by which the note's undervalued candidates get seen at all.

**It generates the Q-003 validation data as a by-product.** Simulator behaviour → who
received a discovery experiment → who then succeeded at a paid trial. That is a
correlation nobody has established, and it would make the project fundable as a research
instrument rather than only as training.

**What this costs us.**

It requires a programme partner with an actual staged portfolio, which makes
[Q-002](../../memory/OPEN_QUESTIONS.md) the critical path rather than a background
question. Most existing programmes are not structured this way, and a partner with a
single-shot grant competition cannot host this design at all.

Completion-as-gate is a weak filter by construction. A programme wanting sharper
up-front screening will find it unsatisfying, and will push to use performance instead.

It also implies a longer engagement than a tutorial — see below.

**What it forecloses.**

Using the simulator as a high-stakes screen, unless and until Q-003 resolves positively.
That is intentional.

**Knock-on effects.**

- [Q-004](../../memory/OPEN_QUESTIONS.md) (playthrough length) is partly answered by
  implication: pre/post assessment plus a delayed retest implies multi-session
  engagement, not a 30-minute tutorial.
- [Q-002](../../memory/OPEN_QUESTIONS.md) becomes urgent. A stage-zero gate only exists
  if there is a stage 1 to gate into.

## Alternatives considered

**During the programme only.** Clean teaching value, no gaming incentive, no consent
problem, no fairness exposure, and it could ship without a partner's selection process
changing at all. Rejected as the primary framing because it discards the selection
purpose entirely — and as the background note observes, competent business training tools
already exist. This is nonetheless a **good fallback**, and the one we land on if Q-003
resolves negatively; `docs/theory-of-change.md` deliberately keeps the learning and
selection pathways independent so that outcome is a scoping decision rather than a
failure.

**Prerequisite as a performance gate** — score the playthrough, admit the top N. The
obvious reading of "on-ramp for grant applications", and what most programmes would ask
for. Rejected on two grounds. First, fairness: it would exclude the low-screen-fluency
experienced operator who the thesis says is the strongest candidate. Second, validity: it
places maximum consequence on an instrument with no established predictive signal, which
is exactly the practice ADR-0004 was written to avoid.

**Prerequisite gating a large grant directly**, skipping the staged portfolio. Simpler to
explain to a partner. Rejected for the same reasons, more acutely — the higher the stake,
the worse both objections get.

**No gate at all** — the simulator is purely optional and self-selected. Attractive for
consent and fairness, and it removes every objection above. Rejected because a fully
optional tool generates a self-selected sample, which is close to useless as a selection
signal and would not produce interpretable validation data either.

## Revisit if

- The project owner rejects the framing — this ADR is superseded rather than amended
  ([Q-009](../../memory/OPEN_QUESTIONS.md)).
- [Q-002](../../memory/OPEN_QUESTIONS.md) establishes that no available partner runs a
  staged portfolio, making stage zero a stage that does not exist.
- [Q-003](../../memory/OPEN_QUESTIONS.md) resolves negatively, in which case the
  during-programme-only alternative becomes correct and this ADR should be superseded.
- Fairness testing shows completion itself is strongly confounded by digital fluency, not
  just performance.
