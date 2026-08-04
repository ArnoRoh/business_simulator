# Project state

**Snapshot as of:** 2026-08-04
**Last session:** [`sessions/2026-08-04-005-depth-numbers-and-swahili.md`](./sessions/2026-08-04-005-depth-numbers-and-swahili.md)

> This file is a **snapshot, not a history**. Overwrite it at the end of every session
> so it always describes the present. History belongs in `sessions/` and
> `DECISIONS.md`.

---

## Where we are

**There is a playable simulator in two languages.** `app/` runs in a browser, phone-first,
20 turns end to end, in English or Kiswahili, with a full before/after ledger, delayed
consequences that name the decision that caused them, and a results profile.

Five sessions: repository bootstrap (001), an ideation discussion on pedagogy and placement
(002), the first build (003), a shareable single-file version (004), and a rework for depth,
number legibility and Kiswahili (005) after the owner played it.

The project rests on the owner's background note
([`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md)) —
read it before anything else.

## What exists

| Area | State |
|---|---|
| **`app/` — the simulator** | **Playable.** 20 turns, one scenario, English + Kiswahili, light/dark, ~62KB gzipped. |
| Operating guide (`AGENTS.md`, `CLAUDE.md`) | Written. Carries the thesis and memory protocol. |
| Memory system | In use — this file, 10 decisions, 12 open questions (2 resolved), glossary, 5 session entries. |
| Governance, licences | Written. MIT code + CC BY-SA 4.0 content. |
| Design docs (`docs/`) | First draft. **Now well behind the code** — see below. |
| Regional context (`docs/context/`) | Owner's note in place. Country detail still a **deliberate stub**. |
| ADRs | Six, **all `Accepted`** — 0005 ratified 2026-08-04. |
| Tests | 4 checks, all green: engine (74), scenario (60/60), i18n, links (191). |
| Curriculum content | One scenario. No second scenario, so still no transfer testing. |
| Partners, pilot sites, funding | Still not recorded. See Q-002. |

## How to run it

**Locally:**

```bash
cd app && python3 -m http.server 8000
```

Then open `http://localhost:8000`. It needs a server — `file://` will not work for
`index.html`, because the browser refuses to fetch the content JSON. (`standalone.html`
does work from `file://`.) See [`../app/README.md`](../app/README.md).

**Hosted:** the session 004 artifact link is **stale** — it serves the 16-turn,
English-only build. `app/standalone.html` has been rebuilt from the current code and needs
republishing to the same path.

## Decisions locked in

1. The simulator is a **selection instrument, not a business-plan generator** (ADR-0004).
   The defining decision.
2. **Mobile-first, offline-capable PWA** (ADR-0002).
3. **MIT** code, **CC BY-SA 4.0** content (ADR-0003).
4. **Tanzania first** (D-005).
5. **Vanilla ES modules, no build step, no dependencies** (ADR-0006).
6. **Stage-zero placement, with completion as the gate** (ADR-0005, now `Accepted`; D-008).
   Finishing is what carries a learner forward — never how many predictions they got right.
7. **Bilingual content inline and key-major**, parity enforced by a check (D-009).
8. **Mean-reverting demand, hygiene floor** (D-010) — the business degrades but cannot be
   driven to a dead state it can never leave.

## What the app now does that the docs do not describe

- **Predict-then-reveal**, with each band labelled with the money it covers.
- **Work it out** — the arithmetic of the current position, shown before predicting.
- **Before/after ledger** on every reveal, with the changed line highlighted, and a note
  naming the line that moved when a prediction was wrong.
- **Delayed consequences** that attribute themselves to the earlier decision.
- **Owner time as a real constraint** — it scales with output, falls with staff, and
  degrades quality when exceeded.
- **Trajectory projection** twelve weeks ahead.
- **Three-layer record** — observations, indicators with evidence, hedged profile. No score,
  no rank, no percentile, enforced by tests.

Still unimplemented: far-transfer testing, pre/post, delayed retest. All need a second
scenario.

## What is not decided

Blocking, in priority order — full list in [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md):

- **Q-002** — Which programme this feeds, and whether any partner runs a staged portfolio.
  Now the top blocker: ADR-0005 is accepted, and a stage-zero gate only exists if there is a
  stage 1 to gate into.
- **Q-001** — Primary learner segment.
- **Q-004** — Playthrough length. Q-013 now asks whether 20 deeper turns is right.
- **Q-015** — Is the Kiswahili register right? Needs a first-language speaker; the app says
  so on screen until it is checked.

## Immediate next steps

1. **The owner plays it again**, in both languages. Q-011 (does this hold anyone's
   attention) and Q-013 (is it now the right length) are still unanswered by argument.
2. **Get the Kiswahili reviewed** by a first-language speaker with business exposure —
   Q-015 lists the specific word choices to check.
3. **Look at it on a real phone.** Nobody has. There is no browser in the working
   environment any more, so this version has been verified headlessly for behaviour and
   text but not for layout.
4. Republish `standalone.html` so the shared link stops serving the old build.
5. Verified Tanzanian figures to replace the placeholders, so the in-app banner can come
   down.
6. Reconcile `docs/` with the code — Q-012 being settled was the stated precondition.
7. A second scenario in a different business — still the precondition for transfer testing.
8. Service worker, so ADR-0002's offline requirement is actually met.

## Notes for whoever picks this up next

- Read `AGENTS.md` §2 first. A business-plan builder, pitch scoring and personality
  assessment are all ruled out by the thesis and will look like obvious wins.
- **Run all four checks after any content edit**, and `validate-i18n.mjs` after touching any
  string. Every new UI string needs both languages in `app/content/ui.json`.
- **`validate-scenario.mjs` checks band stability, not viability.** It passed throughout the
  session-005 bug where demand ran to zero and stayed there. If you change the drift rules,
  print the state along each robot path and look at it.
- The owner runs Upendo Honey / Third Man Ltd, Tanganyika Blue and Dark Earth Carbon in
  Tanzania — the available sources of ground truth, and the likely route to a Kiswahili
  reviewer.
