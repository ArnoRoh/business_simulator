# Project state

**Snapshot as of:** 2026-08-02
**Last session:** [`sessions/2026-08-02-003-playable-proof-of-concept.md`](./sessions/2026-08-02-003-playable-proof-of-concept.md)

> This file is a **snapshot, not a history**. Overwrite it at the end of every session
> so it always describes the present. History belongs in `sessions/` and
> `DECISIONS.md`.

---

## Where we are

**There is a playable proof of concept.** `app/` runs in a browser, phone-first, 16 turns
end to end, with graphics, prediction-based assessment and a results profile.

Three sessions so far: repository bootstrap (001), an ideation discussion on pedagogy and
programme placement (002), and this build (003).

The project rests on the owner's background note
([`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md)) —
read it before anything else.

## What exists

| Area | State |
|---|---|
| **`app/` — the simulator** | **Playable.** 16 turns, one scenario, English, light/dark, ~33KB gzipped. |
| Operating guide (`AGENTS.md`, `CLAUDE.md`) | Written. Carries the thesis and memory protocol. |
| Memory system | In use — this file, decisions, 14 open questions, glossary, 3 session entries. |
| Governance, licences | Written. MIT code + CC BY-SA 4.0 content. |
| Design docs (`docs/`) | First draft. **Now partly behind the code** — see below. |
| Regional context (`docs/context/`) | Owner's note in place. Country detail still a **deliberate stub**. |
| ADRs | Six. 0001–0004 and 0006 `Accepted`; **0005 `Proposed`**, partly confirmed. |
| Tests | `test-engine.mjs` (47 assertions), `validate-scenario.mjs` (48/48), `check-links.sh` (178 links). |
| Curriculum content | One scenario. No second scenario, so no transfer testing. |
| Partners, pilot sites, funding | Still not recorded. See Q-002. |

## How to run it

```bash
cd app && python3 -m http.server 8000
```

Then open `http://localhost:8000`. It needs a server — `file://` will not work, because
the browser refuses to fetch the scenario JSON. See [`../app/README.md`](../app/README.md).

## Decisions locked in

1. The simulator is a **selection instrument, not a business-plan generator** (ADR-0004).
   The defining decision.
2. **Mobile-first, offline-capable PWA** (ADR-0002).
3. **MIT** code, **CC BY-SA 4.0** content (ADR-0003).
4. **Tanzania first** (D-005).
5. **Vanilla ES modules, no build step, no dependencies** (ADR-0006).
6. Proof-of-concept scope: one scenario, English, placeholder figures (D-007).
7. **Stage-zero placement confirmed** by the owner in session 003 — the simulator sits
   before a competition and exists to widen the funnel.

## Implemented from session 002's proposals

- **Predict-then-reveal** — the learner commits to an expected outcome before seeing it.
  Serves engagement and measurement at once.
- **Three-layer record** — observations, derived indicators with evidence, hedged
  profile. No score, no rank, no percentile, enforced by tests.
- **Consequence over instruction** — the P&L is computed by the engine, never authored.

Still unimplemented: far-transfer testing, pre/post, delayed retest.

## What is not decided

Blocking, in priority order — full list in [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md):

- **Q-012** — **Performance gate or completion gate?** The owner described passing people
  who "get all the questions right"; ADR-0005 argued for completion, with performance
  informing only the next stage. This has real fairness consequences and needs a
  deliberate call.
- **Q-001** — Primary learner segment.
- **Q-002** — Which programme this feeds, and whether any partner runs a staged portfolio.
- **Q-004** — Playthrough length. Partly answered; Q-013 asks whether 16 turns is right.

## Immediate next steps

1. **The owner plays it.** That is what it was built for. Q-011 (does this hold anyone's
   attention) cannot be settled by argument.
2. **Answer Q-012.** It determines what happens at the end of a run.
3. Verified Tanzanian figures to replace the placeholders, so the in-app banner can come
   down.
4. A second scenario in a different business — the precondition for transfer testing.
5. Service worker, so ADR-0002's offline requirement is actually met.

## Notes for whoever picks this up next

- Read `AGENTS.md` §2 first. A business-plan builder, pitch scoring and personality
  assessment are all ruled out by the thesis and will look like obvious wins.
- **Run `node scripts/validate-scenario.mjs` after any content edit.** It caught 17 real
  problems on its first run, including options that would have marked learners wrong for
  being right.
- **`docs/` has not been rewritten to match the code.** `game-design.md`,
  `assessment.md` and `curriculum.md` describe the design as of session 001; the app
  implements session 002's refinements. Reconciling them is worth doing once Q-012 is
  settled, not before.
- The owner runs Upendo Honey / Third Man Ltd, Tanganyika Blue and Dark Earth Carbon in
  Tanzania — the available sources of ground truth.
