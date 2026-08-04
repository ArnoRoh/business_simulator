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

---

## Pending — proposed, not decided

Entries below are **not decisions.** They are recorded here so the index is complete and
so nobody has to hunt for them. Do not act on them as settled.

*(ADR-0005 was ratified on 2026-08-04 — see D-008 above. Nothing is currently pending.)*

Of the further proposals from
[session 002](./sessions/2026-08-02-002-pedagogy-and-timing-ideation.md),
**predict-then-reveal** is implemented and now shows the learner the money ranges each band
covers. **Far-transfer testing** and **pre/post plus delayed retest** remain unimplemented
and unratified; both need a second scenario.
