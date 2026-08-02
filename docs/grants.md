# Grant and training pipelines

> **Status:** first draft, and **substantially blocked on
> [Q-002](../memory/OPEN_QUESTIONS.md)** — we do not yet know which programme this feeds.
> Until that is answered, this describes intent rather than a specification.

How simulator output is meant to reach the programmes that select and fund
entrepreneurs, and what we will and will not let it be used for.

---

## The role we are trying to play

Selection today is expensive per candidate and weakly predictive. A panel can interview
dozens; a programme receives hundreds or thousands of applications, and screens them on
written plans that the evidence says predict poorly.

The intent is a **first-stage screen**: cheap enough per candidate to widen the funnel
rather than narrow it, based on observed behaviour rather than written claims.

```
  Wide pool  ──►  Simulator  ──►  Shortlist  ──►  Human stages  ──►  Funding
  (thousands)     behavioural      (dozens)       interview,        decision
                  record                          site visit,
                                                  real execution test
```

**We are the first stage only.** The simulator does not replace interviews, site visits
or a real six-to-twelve-week execution test. It decides who gets looked at, not who gets
funded. Any programme proposing to use it as a final filter is misusing it, and we
should say so.

---

## What a programme receives

The **readiness profile** — see [`assessment.md`](./assessment.md) for the rules that
govern it. In summary:

- What the candidate did in simulation, anchored to specific observations
- Which capabilities their behaviour exercised, with the evidence for each
- The constraint they identified in their own words, and whether their spending matched
  it
- What they did after setbacks
- **No composite score. No ranking. No prediction.**
- Its own limitations stated inside the document

**Learner-controlled.** Nothing reaches a programme without the learner's explicit
opt-in. They see their profile in full first. A learner may play and share nothing.

---

## Use we will not support

**Automated rejection.** No profile field may be used as a mechanical cut-off. A single
number would make this trivial and is one reason there isn't one.

**Ranking candidates against each other.** The profile describes one person's behaviour.
Cross-candidate comparison implies a validated common scale, which does not exist.

**Any claim of predictive validity.** Until an external study says otherwise, a
programme that describes this as predicting entrepreneurial success is misrepresenting
it. Materials we supply must make that difficult to do accidentally.

**Selection use before fairness testing.** Until the checks in `assessment.md` are done,
selection use is explicitly experimental and must be labelled as such to everyone
involved, including the learner.

These constraints will cost us adoption. Some programmes want a score they can sort on.
That is the thing this project exists to argue against, and conceding it would make the
tool part of the problem.

---

## Where this fits a better funding model

The background note argues for: many cheap experiments, staged funding, selection on
demonstrated execution, and support that removes one verified bottleneck rather than
funding generic growth.

The simulator serves that model in three places:

**Widening the top of the funnel.** If screening is nearly free per candidate, a
programme can look at people who would never have submitted a competitive written
application — the Joseph persona. That is the population the note says is most
undervalued.

**Teaching bottleneck articulation.** Programmes that fund bottleneck removal need
applicants who can state a specific constraint and what removing it would change.
Curriculum Track 5 teaches exactly this, which makes candidates more fundable under that
model *and* better operators regardless.

**Producing a shared vocabulary.** A candidate and a programme officer who have both
seen the same simulation can discuss unit economics or capability jumps concretely. That
is a small benefit and a real one.

---

## Integration, once we know the consumer

Deliberately unspecified pending [Q-002](../memory/OPEN_QUESTIONS.md). Likely forms, in
order of increasing commitment:

1. **Printable / PDF profile** the learner carries to an application. Works with any
   programme, no integration, no data sharing beyond the learner's own act. This is the
   floor and should exist regardless.
2. **Shareable link** with learner-controlled revocation.
3. **Structured export** for programmes that ingest data.
4. **API integration** into a programme's own system.

Build (1) first. It is useful immediately, degrades gracefully, and does not require a
partner to exist.

---

## Honesty obligations toward learners

The learner is the person with the most at stake and the least power in this
arrangement. Non-negotiable:

- They are told, before they start, what is recorded and what it may be used for.
- They see everything recorded about them.
- They can play without sharing.
- They are **never told that completing this improves their funding chances**, because
  we do not know that.
- If we are unsure whether the profile helps them, we say so plainly.

## Open

- **[Q-002]** Which programme, and what can it actually ingest — blocks most of this.
- **[Q-008]** Data protection, consent and hosting once records affect funding.
- **[Q-003]** Predictive validity. Without it, everything above is offered as a
  hypothesis, and should be described that way to partners.
