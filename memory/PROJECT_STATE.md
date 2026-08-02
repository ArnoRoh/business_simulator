# Project state

**Snapshot as of:** 2026-08-02
**Last session:** [`sessions/2026-08-02-001-repo-bootstrap.md`](./sessions/2026-08-02-001-repo-bootstrap.md)

> This file is a **snapshot, not a history**. Overwrite it at the end of every session
> so it always describes the present. History belongs in `sessions/` and
> `DECISIONS.md`.

---

## Where we are

**Stage: documentation and design.** No application code exists yet, deliberately.
The repository has just been bootstrapped with its operating guide, memory system,
governance files and a first pass at design documentation.

The project owner supplied a substantial background note on transformational
entrepreneurship (now at
[`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md)).
It is the intellectual foundation of the project and reframed the scaffold: this is
not a generic business-literacy tool but an attempt to build a **cheap, scalable
first-stage execution test** that also teaches.

## What exists

| Area | State |
|---|---|
| Operating guide (`AGENTS.md`, `CLAUDE.md`) | Written. Reflects the transformational-entrepreneurship thesis. |
| Memory system | Established — this file, decisions, open questions, glossary, session log. |
| Governance (contributing, conduct, security, licences) | Written. MIT code + CC BY-SA 4.0 content. |
| Design docs (`docs/`) | **First draft only.** Vision, theory of change, curriculum, game design, assessment, grants, personas, localisation. All need owner review. |
| Regional context (`docs/context/`) | Owner's background note in place. Country-level operating detail is a **stub** and largely unverified. |
| ADRs | Four recorded: ADR process, PWA delivery, dual licensing, simulator-as-selection-instrument. |
| Application code | **None.** Not started. |
| Curriculum content | **None.** Only the capability map exists. |
| Partners, pilot sites, funding | Not yet recorded in repo. |

## Decisions locked in

1. Delivery is a **mobile-first, offline-capable PWA** (ADR-0002).
2. **MIT** for code, **CC BY-SA 4.0** for learning content (ADR-0003).
3. The simulator is designed as a **selection instrument as well as a teaching tool**,
   and explicitly *not* as a business-plan generator (ADR-0004).
4. Geographic sequence: **Tanzania first**, then wider East Africa.

## What is not decided

See [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) for the full list. The ones blocking
the most downstream work:

- **Q1** — Which learner segment is the primary target: existing small firms with
  traction, or pre-revenue founders? This determines the entire curriculum shape.
- **Q2** — Is there a named partner or programme this feeds into, and what does their
  selection process actually need from us?
- **Q4** — How long is a full playthrough? Minutes, or a multi-week engagement?

## Immediate next steps

1. Owner review of `docs/vision.md`, `docs/theory-of-change.md` and
   `docs/assessment.md` — these encode the strongest interpretive claims and are the
   most likely to be wrong.
2. Resolve **Q1** and **Q4**; almost everything downstream depends on them.
3. Replace the stub in `docs/context/` with verified Tanzania operating detail —
   registration steps, real costs, tax thresholds, licensing. Needs local ground truth.
4. Specify one end-to-end scenario in depth before writing any code.

## Notes for whoever picks this up next

- Read `AGENTS.md` §2 before proposing features. Several obvious-seeming ideas
  (business-plan builder, pitch scoring, personality assessment) are explicitly ruled
  out by the project's thesis, and proposing them will waste your session.
- The owner operates real firms in Tanzania — Upendo Honey / Third Man Ltd,
  Tanganyika Blue, Dark Earth Carbon. These are live sources of ground truth for
  scenario realism, and the honey value chain is a strong candidate for the first
  worked scenario.
- Anything in `docs/context/` beyond the owner's own note should be treated as
  unverified until someone with local knowledge signs it off.
