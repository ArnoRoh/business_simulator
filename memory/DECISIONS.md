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
