# Project state

**Snapshot as of:** 2026-08-02
**Last session:** [`sessions/2026-08-02-002-pedagogy-and-timing-ideation.md`](./sessions/2026-08-02-002-pedagogy-and-timing-ideation.md)

> This file is a **snapshot, not a history**. Overwrite it at the end of every session
> so it always describes the present. History belongs in `sessions/` and
> `DECISIONS.md`.

---

## Where we are

**Stage: documentation and design.** No application code yet, deliberately.

Two sessions so far. Session 001 bootstrapped the repository — operating guide, memory
system, governance, first-draft design docs — grounded in the project owner's background
note on transformational entrepreneurship
([`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md)),
which is the intellectual foundation of the whole project.

Session 002 was an **ideation discussion** on pedagogy, engagement, assessment and where
the simulator sits relative to a grant programme. It produced a substantial body of
proposals and **no decisions**. The scaffold and both session records were merged to
`main`.

## What exists

| Area | State |
|---|---|
| Operating guide (`AGENTS.md`, `CLAUDE.md`) | Written. Carries the thesis and the memory protocol. |
| Memory system | Established and in use — state, decisions, 11 open questions, glossary, 2 session entries. |
| Governance (contributing, conduct, security, licences) | Written. MIT code + CC BY-SA 4.0 content. |
| Design docs (`docs/`) | **First draft, unreviewed, and now partly out of date** — they do not reflect session 002, deliberately, because none of it is ratified. |
| Regional context (`docs/context/`) | Owner's background note in place. Country operating detail is a **deliberate stub**. |
| ADRs | Five. 0001–0004 `Accepted`; **0005 `Proposed`** and awaiting a ruling. |
| Application code | **None.** Not started. |
| Curriculum content | **None.** Only the capability map, itself provisional. |
| Partners, pilot sites, funding | Not yet recorded in repo. See Q-002. |

## Decisions locked in

1. **Mobile-first, offline-capable PWA** (ADR-0002).
2. **MIT** for code, **CC BY-SA 4.0** for content (ADR-0003).
3. The simulator is a **selection instrument as well as a teaching tool**, and explicitly
   *not* a business-plan generator (ADR-0004). This is the defining decision.
4. Geographic sequence: **Tanzania first**, then wider East Africa (D-005).
5. Documentation before code (D-001).

## Proposed but NOT decided

From session 002. Recorded so the reasoning survives; **not to be built against.**

- **Stage-zero placement** (ADR-0005, `Proposed`) — the simulator gates entry to a ~$500
  discovery experiment; **completion**, not performance, is the gate; the behavioural
  record informs the *next* stage transition. Awaiting Q-009.
- **Predict-then-reveal** — learner states an expected outcome before committing. Serves
  engagement and measurement simultaneously; calibration is hard to fake. The strongest
  single idea from session 002, and largely independent of the placement question.
- **Assessment design** — far-transfer testing across unfamiliar business contexts,
  pre/post on a novel scenario for a per-learner delta, and a delayed retest at ~4 weeks.
- **"Compelling rather than fun"** — reject Tycoon-style optimisation loops as teaching a
  false model of business; rely on recognition, consequence, character and prediction.
- **Teaching approach for the named skills** — withhold the P&L until records become
  necessary; concentration risk via a dominant buyer; founder time as an explicit scarce
  resource.

## What is not decided

Full list in [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md). Blocking, in priority order:

- **Q-009** — Confirm or reject the stage-zero placement. Everything from session 002 is
  downstream, and it determines whether three design docs need rewriting.
- **Q-001** — Primary learner segment: existing firms with traction, or pre-revenue
  founders? Determines the entire curriculum shape.
- **Q-002** — Which programme does this feed, and does any available partner run a
  *staged* portfolio? Escalated by session 002 — the proposed design needs a stage 1 to
  gate into.
- **Q-004** — Playthrough length. Partly answered by implication (multi-session), not
  closed.

## Immediate next steps

1. **Owner rules on Q-009.** Highest leverage single action available.
2. Owner review of `docs/vision.md`, `docs/theory-of-change.md` and `docs/assessment.md`
   — these encode the strongest interpretive claims and remain unreviewed from session
   001.
3. Resolve **Q-001**; pursue **Q-002**, now on the critical path.
4. Replace the stub in `docs/context/` with verified Tanzania operating detail. Needs
   local ground truth.
5. Specify one end-to-end scenario — honey is the candidate (Q-005) — deep enough to test
   whether the session-002 mechanics survive contact with real content.

## Notes for whoever picks this up next

- Read `AGENTS.md` §2 before proposing features. A business-plan builder, pitch scoring
  and personality assessment are all ruled out by the thesis and will look like obvious
  wins.
- **Session 002 is a conversation, not a design.** Its proposals are unratified. The
  `docs/` tree deliberately does not reflect them yet.
- The owner operates real firms in Tanzania — Upendo Honey / Third Man Ltd, Tanganyika
  Blue, Dark Earth Carbon — and these are the available sources of ground truth.
- Anything in `docs/context/` beyond the owner's own note should be treated as unverified
  until someone with local knowledge signs it off.
