# The app — proof of concept

A playable first pass. **Not a finished product**, and several things in it are
deliberately provisional.

## Run it

It needs a web server — opening `index.html` directly with `file://` will fail, because
the browser refuses to `fetch` the scenario JSON from the filesystem.

```bash
cd app
python3 -m http.server 8000
```

Then open **http://localhost:8000** — and on a phone, use your computer's LAN address
(`http://192.168.x.x:8000`) with both devices on the same network. Testing on an actual
phone matters more than testing in a desktop browser with a narrow window; the design
target is a low-end Android device.

## What it does

One scenario: a small cooked-food business. Each turn follows the loop from
[`../docs/game-design.md`](../docs/game-design.md):

```
situation → (optional information, which costs time or money) → decision
          → PREDICTION → consequence
```

The prediction step is the point. Before finding out what happened, the learner commits
to what they expect. That single mechanic does two jobs at once: it is the moment of
engagement, and it is the measurement — you cannot become well-calibrated about a system
without understanding it, which makes it much harder to fake than a quiz.

At the end, a profile reports what was observed.

## Architecture

**No build step, no dependencies, no network calls.** Plain ES modules, served as files.
A framework would cost more in kilobytes than it buys here, and learners pay for their
own data ([ADR-0002](../docs/adr/0002-mobile-first-offline-pwa.md)).

| File | Role |
|---|---|
| `js/engine.js` | Simulation. Computes the weekly P&L from state. |
| `js/record.js` | The behavioural record — observations, indicators, profile. |
| `js/ui.js` | Rendering. One decision per screen. |
| `js/scene.js` | SVG graphics that reflect game state. |
| `js/storage.js` | Local-only persistence. |
| `js/main.js` | Turn state machine. |
| `content/*.json` | Scenarios, authored as **data, not code**. |

**The weekly P&L is computed, never authored.** Content supplies decisions and their
effects on state; the economics fall out of that. If an author could hand-write outcomes,
the numbers would stop being internally consistent and the learner would be memorising a
story rather than reasoning about a system.

Scenarios being data is a hard requirement, not a convenience: it is what allows someone
with local business knowledge and no programming skill to write and review content.

## Tests

```bash
node scripts/test-engine.mjs
```

Covers the economics and — importantly — asserts that the generated profile contains no
score, rank or percentile field, and that its statements stay observational. Those
guardrails come from [`../docs/assessment.md`](../docs/assessment.md) and are the easiest
thing to erode by accident.

## Known gaps

- **All money figures are placeholders.** The in-app banner says so. Real Tanzanian
  costs, fees and prices are deliberately absent — see
  [`../docs/context/`](../docs/context/) for why inventing them would be worse than
  leaving them out.
- **English only.** The string handling is localisation-ready in structure, but there is
  no translation layer yet, and no Swahili.
- **No service worker**, so it is not yet installable or offline-capable. The manifest is
  in place; the caching layer is not.
- **One scenario.** Far-transfer testing — the same concept in an unfamiliar business —
  needs a second scenario and does not exist yet.
- **No pre/post or delayed retest**, both of which the assessment design calls for.
- **Prediction is single-metric** (weekly profit). Richer prediction targets would give a
  better signal.

## Open questions this does not resolve

Playing it should inform [Q-001](../memory/OPEN_QUESTIONS.md) (who is this for),
[Q-004](../memory/OPEN_QUESTIONS.md) (how long should it be),
[Q-009](../memory/OPEN_QUESTIONS.md) (the stage-zero placement) and
[Q-011](../memory/OPEN_QUESTIONS.md) (does this actually hold anyone's attention).

That last one is the real purpose of the prototype. The argument for "compelling rather
than fun" is an argument, not evidence — it needs someone to sit with it and get bored,
or not.
