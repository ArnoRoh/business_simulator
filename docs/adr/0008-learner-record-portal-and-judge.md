# ADR-0008 — The learner record, the portal, and the AI judge

**Status:** **Proposed** — 2026-08-10. Not accepted; no code should be written against it yet.
**Date:** 2026-08-10
**Deciders:** Project owner (pending)
**Related:** [ADR-0002](./0002-mobile-first-offline-pwa.md), [ADR-0004](./0004-simulator-as-selection-instrument.md), [ADR-0005](./0005-simulator-as-stage-zero-gate.md), [D-034](../../memory/DECISIONS.md), [D-036](../../memory/DECISIONS.md), [D-037](../../memory/DECISIONS.md), [P-001](../../memory/DECISIONS.md), [Q-008](../../memory/OPEN_QUESTIONS.md), [Q-030](../../memory/OPEN_QUESTIONS.md), [Q-034](../../memory/OPEN_QUESTIONS.md), [Q-035](../../memory/OPEN_QUESTIONS.md), [Q-039](../../memory/OPEN_QUESTIONS.md), [session 017](../../memory/sessions/2026-08-09-017-the-funnel-gets-a-shape.md)

## Context

Until session 017 the simulator produced a record that lived in one phone's `localStorage`
and had nowhere to go. That was correct while there was no consumer for it. There is one
now.

[D-034](../../memory/DECISIONS.md) describes a three-stage funnel the owner is building:
stage 0 is this simulator; **stage 1** is a business plan submitted through a portal and
marked by an AI, where the plan is a **forecast** — dated, numeric predictions about the
applicant's own firm ([D-036](../../memory/DECISIONS.md)); **stage 2** is a six-month
review of that forecast against what actually happened, corroborated by monthly photo
evidence ([D-037](../../memory/DECISIONS.md)). Fifty grants of USD 1,000 in the pilot.

Three things follow that the current architecture cannot do:

1. A stage-1 judge must read a learner's game record **beside** their forecast.
2. A stage-2 reviewer must find **the same person** six months later.
3. [Q-034](../../memory/OPEN_QUESTIONS.md) — the pilot must be able to answer whether the
   filter works at all, which requires stage-0 records for **everyone**, including the
   people who never finish and never apply. They are the comparison group. Data not kept
   at stage 0 cannot be recovered at stage 2.

This is also the point at which the project acquires **consequential personal data**: a
record that feeds a funding decision, about participants `SECURITY.md` describes as often
vulnerable, under Tanzania's Personal Data Protection Act
([Q-008](../../memory/OPEN_QUESTIONS.md)).

### Constraints that are not ours to relax

| Constraint | Source |
|---|---|
| Works offline after first load; small data footprint; learners pay per megabyte | `AGENTS.md` §3, [ADR-0002](./0002-mobile-first-offline-pwa.md) |
| No single-vendor cloud lock-in — grant-funded work stays portable and auditable | `AGENTS.md` §3 |
| Local-first storage; the learner holds their own record; explicit opt-in before anything is shared | `SECURITY.md`, `AGENTS.md` §3 |
| No score, no rank, no percentile in the record | [ADR-0004](./0004-simulator-as-selection-instrument.md), enforced by tests |
| We claim only *observed in-simulation behaviour*, never predicted performance | `docs/assessment.md`, [Q-003](../../memory/OPEN_QUESTIONS.md) |
| Target device is a 2GB Android on metered data | `AGENTS.md` §3 |

## Decision (proposed)

### 1. The app stays local-first and fully offline. Submission is one explicit act.

We will **not** build sync, accounts, or login. The simulator continues to work with no
network, no server and no identity. At the end of a chapter the learner is offered **one
explicit opt-in submit**, which posts their record and then gets out of the way.

Submission queues offline and sends when connectivity allows. **It never blocks play**, and
a learner who declines, or whose upload never succeeds, loses nothing — the app must
degrade to *show and share your own record* and remain fully usable. On the target device
that case is common, not exceptional.

### 2. Stage 0 collects no identifying data at all.

This is the part most likely to be eroded later, so it is stated as a rule rather than a
default.

- On first load the app generates a **random install identifier** (a UUID). It is not
  derived from the device, the number, or anything about the person.
- The record is submitted against that identifier alone. **No name, no phone number, no
  email, no location.**
- The learner is shown a short **claim code** they can screenshot or write down.

**Identity is only collected when money is involved** — at the point of applying to stage 1,
where there is an actual reason for it and a real consent moment. The applicant enters their
claim code, and the join to their stage-0 record happens there.

Playing the game requires no identity. Applying for a grant does. That distinction is the
whole of the data-minimisation story and it should survive contact with convenience.

### 3. Records are retained for everyone who submits, including non-applicants.

Non-completers and non-applicants are the comparison group without which
[Q-034](../../memory/OPEN_QUESTIONS.md) is unanswerable and the pilot cannot validate its
own filter. Their records are anonymous by construction under (2), which is what makes
retaining them proportionate.

The record carries **per-decision entries with timestamps**, not just a summary. A summary
cannot answer questions nobody has thought of yet, and this dataset gets one chance to be
collected.

**Submission must exist mid-chapter, not only at the end** *(added 2026-08-21, session 019,
before acceptance)*. As first written, the one explicit submit sat at the end of a chapter —
which meant a learner who stopped at turn eleven never submitted, and **drop-off was
invisible by construction**. Completion rate is the load-bearing assumption in the cost
model (`ch1_completion` in `scripts/lib/cea_model.py`, labelled *untested*): USD 22 per
finisher and the 2.67× multiple scale directly off it, and nothing else in the funnel
measures it. Under local-first rules we cannot observe drop-off remotely, so the only way
to see it is to let partial records be submitted under the same anonymity as complete ones.
Concretely: the submit affordance appears at every chapter boundary reached, and a record
submitted mid-way is stored and retained exactly like any other. It never blocks play and
is still one deliberate act per submission, not sync.

### 4. The recruitment channel is one field, captured at first load.

A `?src=` parameter on the entry URL, stored with the install identifier and carried
through to stage 2. [Q-039](../../memory/OPEN_QUESTIONS.md): whoever the channel reaches is
the population everything downstream selects from — a filter coarser than the simulator,
sitting above it, currently invisible. One field makes the bias measurable instead of
unknown.

### 5. The judge scores blind, and raw submissions are stored.

- The AI judge scores a stage-1 forecast **without access to the stage-0 record**. Any
  combined view is produced as a separate, second pass.
- **Raw portal submissions and transcripts are stored, not only scores.** An AI judge is
  re-runnable — the whole cohort can be re-scored next year against a better rubric — and
  that property is worth more than the cost saving, but only if the inputs still exist.
- Every applicant is scored, including those who receive nothing.

Blinding is easy to skip and impossible to retrofit: a judge that can see the stage-0 rank
produces a contaminated score, and the two can never be decomposed
([P-001](../../memory/DECISIONS.md) B).

### 6. The portal probes the applicant against their own stage-0 record.

The strongest defence against a pasted, model-written plan is not detection — it is asking
something only this applicant can answer. The portal generates a follow-up from what this
person actually did in the game (*you took the cheap flour at t08 and predicted profit would
rise; your plan assumes a stable input price — which is it?*).

This is also the transfer test rather than an anti-cheating bolt-on
([Q-032](../../memory/OPEN_QUESTIONS.md)). **We will not build text-detector heuristics**:
they do not work and they misfire on second-language writers, which here is nearly everyone.

An **oral or worked-example route** must exist, so literacy is not the hidden filter.

### 7. Hosting is boring and portable.

A single small host running a plain HTTP endpoint over a file-backed relational store
(SQLite is sufficient at this scale, Postgres if it outgrows that). No managed
backend-as-a-service. The entire dataset must be exportable as flat files with one command,
and the whole thing re-standable elsewhere from the repository plus a backup.

Sized for the pilot — **one cohort of low thousands** — and no larger
([D-035](../../memory/DECISIONS.md)). The infrastructure should be near-disposable. **The
schema should not be**, because the stage-2 join depends on fields nobody can go back and
collect.

### 8. What the record claims stays exactly what it claims.

Submission changes where the record lives. It changes nothing about what it asserts. No
score, no rank, no percentile, no composite ([ADR-0004](./0004-simulator-as-selection-instrument.md)),
and no inferred trait described as a measured one. The stage-1 judge receives observations
and hedged indicators, the same three-layer record a learner sees.

### 9. Consent, retention and deletion

- Consent is asked **at submission**, not buried at first load, and says plainly: what is
  sent, who reads it, how long it is kept, and that declining costs the learner nothing.
- Stage-0 anonymous records: retained for the duration of the pilot plus the stage-2
  analysis.
- Identified applicant data: retained while the application is live and for the funding
  relationship, then deleted or re-anonymised.
- A learner can request deletion via their claim code.
- **Photo evidence** ([D-037](../../memory/DECISIONS.md)) is the most sensitive thing
  collected: no faces by default, no geotagging, compressed on device to a couple of
  hundred KB, queued offline, never blocking.

## Consequences

**What this gets us.** A funnel that can actually run. A dataset that can answer
[Q-003](../../memory/OPEN_QUESTIONS.md) — the question this project has said from the
beginning it could not yet answer — as a by-product rather than a separate study. A judge
whose decisions can be re-examined. And a defensible position under the PDPA, because the
sensitive data is collected only from people who chose to apply for money.

**What this costs us.** Real engineering that does not exist. A second unvalidated
instrument (the judge) between people and money, which compounds rather than averages the
risk already carried by the simulator. An operational burden — someone must hold the host,
the backups and the deletion requests. And claim codes will be lost; some learners will
reach stage 1 unable to join to their own record, and the portal has to handle that
gracefully rather than rejecting them.

**What it forecloses.** Anything that needs continuous sync or a logged-in learner: saved
progress across devices, notifications, a facilitator dashboard over live play. Those become
expensive on purpose. It also forecloses the convenience of collecting a phone number up
front, which is the single thing most likely to be proposed as a small exception.

## Alternatives considered

**Collect a phone number at stage 0.** Attractive because it is the realistic identity key
in Tanzania, it survives a lost claim code, and it makes the stage-2 join trivial. Rejected
because it inverts the consent story: it takes the most sensitive identifier we could hold
from everyone who merely *tries the game*, in exchange for a convenience that only matters
for the small minority who apply. If claim codes prove unworkable in the field, this is the
first thing to revisit — with a phone number collected **at application**, not at play.

**A managed backend (Firebase, Supabase and similar).** Attractive because it is hours of
work rather than days, with auth and storage included. Rejected on `AGENTS.md` §3 — no
single-vendor lock-in on grant-funded work — and because the auth it includes is exactly
what decision 1 refuses to build.

**Continuous sync of play state.** Attractive because it gives a much richer behavioural
trace and survives a lost phone. Rejected: it breaks the offline-first guarantee, costs
learners data they pay for by the megabyte, and turns every play session into a transfer of
personal data rather than one deliberate act.

**Let the judge see the stage-0 record.** Attractive because a human reviewer would want
both, and the combined judgement is presumably better. Rejected because it destroys the
ability to ask whether stage 1 adds anything over stage 0 — the two scores become one
number that cannot be decomposed. The combined view is still available as a second pass;
it just cannot be the only pass.

**Store scores rather than raw submissions.** Cheaper and much less sensitive. Rejected
because it throws away the main advantage of an AI judge, which is that its judgement can
be re-run. A score is a decision you cannot revisit; a transcript is evidence you can.

**Skip the anonymous non-applicant records.** Attractive because it is less data, less
exposure and less work. Rejected because it is the difference between a pilot that funds
firms and a pilot that also tells you whether the filter works
([Q-034](../../memory/OPEN_QUESTIONS.md)) — and because it cannot be added retrospectively.

## Revisit if

- **Claim codes fail in the field** — if a material share of stage-1 applicants cannot join
  to their stage-0 record, collect a phone number **at application** and reconsider whether
  a recovery identifier is needed earlier.
- **A cohort exceeds low tens of thousands**, at which point SQLite and a single host stop
  being the obvious answer.
- **A partner brings their own record system**, which would make most of this moot and
  reopen the whole question of who holds learner data.
- **The judge is shown to add nothing over stage 0** once stage-2 outcomes exist, in which
  case stage 1 gets simpler and cheaper rather than better.
