# Vision

> **Status:** first draft, unreviewed. Written from the project owner's background note
> in [`context/transformational-entrepreneurship.md`](./context/transformational-entrepreneurship.md).
> Where this document and that note disagree, the note is right.

## The problem

Development programmes spend large sums selecting and funding small firms in the hope of
creating jobs and growth. Two things go wrong repeatedly.

**Selection does not work well.** Programmes choose recipients on business plans and
pitches. The evidence — including from well-run competitions like Nigeria's YouWiN! —
is that plan scores and judge assessments predict future performance poorly. Charisma,
hardship narratives, business degrees and "grit" questionnaires predict worse. So public
money is allocated on a signal that is close to noise, and capable operators without
polished presentations are filtered out.

**Results are overclaimed.** Employment gains are typically self-reported by
entrepreneurs rather than verified against payroll or social-security records. Whether
the jobs are formal, full-time, durable, or net of displaced competitors usually cannot
be established from the published materials. A programme that turned owner-operated
businesses into owner-plus-two-casual-workers businesses may be decent livelihood
policy — but it gets described as transformational job creation, and the sector plans
accordingly.

Underneath both is a category error: **treating every microenterprise as an underfunded
future medium-sized company.** Most are not, and most never will be. Livelihood
enterprises and transformational enterprises are different things with different needs,
and conflating them produces programmes that serve neither well.

## What we are building

A browser-based business simulation that does two jobs at once.

**It teaches.** A learner runs a simulated enterprise over simulated time: choosing
what to sell and to whom, pricing, managing cash, deciding when to formalise, when to
hire, when to delegate, what to invest in, and what to do when an assumption breaks.
Consequences arrive with realistic lags. The learning comes from consequence, not from
instruction.

**It observes.** Every decision, and the information available when it was made, forms
a **behavioural record**. That record is the basis of a cheap, scalable first stage of
an execution test — a way to see what someone actually does, at a cost per candidate low
enough to screen thousands rather than dozens.

That combination is the point. Teaching tools already exist. What does not exist is a
selection instrument that a programme can put in front of ten thousand applicants for
the cost of putting a panel in front of a hundred.

## What we are deliberately not building

**A business-plan generator.** This is the obvious product, and the one most programmes
would ask for. It is ruled out ([ADR-0004](./adr/0004-simulator-as-selection-instrument.md)).
Building it would sharpen precisely the signal the evidence shows does not work, and
would make this tool part of the problem it exists to address.

**A pitch trainer or personality assessment.** Same reasoning, weaker evidence still.

**A predictor of real-world success.** We have no validation that in-simulation
behaviour predicts real firm outcomes ([Q-003](../memory/OPEN_QUESTIONS.md)). Until we
do, we report what was observed in simulation and nothing more. Holding ourselves to
the standard we apply to others is not optional — see [`assessment.md`](./assessment.md).

**A ranking of learners by ambition.** Livelihood and transformational trajectories are
different paths with different requirements, not a hierarchy. A learner consolidating a
livelihood business is not failing at something else.

## Who it is for

**Learners** — entrepreneurs and operators in East Africa, starting with Tanzania.
Reached through partner programmes rather than consumer channels. Playing on a low-end
Android phone, often offline, frequently in a second or third language, paying for their
own data.

**Programme staff** — the people selecting grant recipients and training participants,
who need a defensible way to look at far more candidates than they can interview.

**Funders and researchers** — who need honest measurement, including of this tool.

See [`personas.md`](./personas.md).

## What success looks like

In rough order of how hard they are:

1. Learners finish a playthrough and can explain what they would do differently in
   their own business. Not "found it useful" — a specific, changed intention.
2. Programme staff use the behavioural record in a real selection decision and say it
   told them something an application form did not.
3. Playing changes real behaviour: a learner identifies their actual binding constraint
   and does something about it.
4. Cost per screened candidate falls far enough that programmes widen their funnel
   instead of narrowing it.
5. **The hard one** — in-simulation behaviour is shown to correlate with real firm
   outcomes, through a study we did not run ourselves.

Only (5) would justify calling this a selection instrument without qualification. Until
then it is a teaching tool that also produces structured observations, and we say so.

## What success does not look like

- "Participants trained" or "businesses reached". These are the metrics the background
  note criticises. They measure activity, not effect.
- Completion rates as a headline. Easy to optimise by making the simulation trivial.
- Learners producing better-looking applications. That is the failure mode dressed as
  success.

## Principles

**Consequence over instruction.** Show the result of a decision; don't lecture about it.

**Realistic costs, honestly modelled.** Formalisation, certification and compliance are
expensive and slow. Programmes that hand-wave them produce entrepreneurs who are
surprised by reality. Model the real numbers, sourced from ground truth.

**Bottleneck thinking.** Push the learner toward "which single constraint, if removed,
changes my trajectory?" — the question the funding model this project supports is built
on.

**Organisation over hustle.** The characteristic failure of a growing firm is a founder
who cannot build beyond themselves. Delegation, systems and hiring are core content, not
advanced extras.

**Built for the constraint, not the demo.** Low-end phone, no connection, expensive
data, second language. These are the design centre, not an accessibility pass at the
end.

**Honest about ourselves.** Every claim this project makes about what it measures must
survive the scrutiny the background note applies to MbeleNaBiz.
