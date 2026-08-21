# The app

Playable in English and Kiswahili, 20 turns. **Not a finished product**, and several things
in it are deliberately provisional.

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

## Single-file version

`standalone.html` is a **generated build artifact** — one self-contained page with the
CSS, JavaScript, scenario content and interface strings inlined. It needs no server and no
checkout, so it can be opened from disk or hosted anywhere.

```bash
node scripts/build-single-file.mjs
```

**Do not edit `standalone.html` directly.** Edit the real files under `app/` and rebuild,
or your changes will be overwritten. It is committed for convenience, which means it can
drift — rebuild it after any change to `app/`. It went one whole chapter stale between
sessions 008 and 011 without anything noticing.

With four chapters embedded it is **~610 KB**. The served app's shell is ~230 KB and it
fetches one chapter (~115–145 KB) on demand, so opening the stall costs roughly half what
the single file does and the three chapters a learner never opens cost nothing at all.
That gap is why this is a convenience artifact and not the delivery route — a learner pays
for their own data ([AGENTS.md](../AGENTS.md) §3). Uncompressed figures; the served app is
gzipped in transit and the single file usually is not.

The build wraps each ES module in its own scope rather than concatenating them, because
`scene.js` and `ui.js` both declare a private `clear` helper that would otherwise
collide. It also injects a `viewport` meta tag, since a host page that supplies its own
`<head>` would otherwise leave the layout at desktop width on a phone.

## What it does

**Four chapters, one owner** ([ADR-0007](../docs/adr/0007-four-chapter-arc.md),
[`../docs/arc.md`](../docs/arc.md)): a mandazi stall, a bakery, a factory, and exporting.
Each is a self-contained 20-turn playthrough with its own authored opening, playable
alone and in any order — nothing is locked. What travels between them is narrative plus
six flags recording how the previous chapter was played.

Each turn follows the loop from [`../docs/game-design.md`](../docs/game-design.md):

```
situation → (optional information, which costs time or money) → decision
          → [work it out] → PREDICTION → consequence, before and after
```

"Work it out" is opt-in per turn since [D-017](../memory/DECISIONS.md), and automatic
wherever the prediction is a number. The common turn is shorter than it was.

The prediction step is the point. Before finding out what happened, the learner commits
to what they expect. That single mechanic does two jobs at once: it is the moment of
engagement, and it is the measurement — you cannot become well-calibrated about a system
without understanding it, which makes it much harder to fake than a quiz.

"Work it out" shows the arithmetic of the learner's current position first, because
predicting a change to a number nobody showed you is guesswork, not reasoning. Each
prediction band is labelled with the money it covers, so the learner and the engine mean the
same thing by "up a little".

Some decisions **set a consequence in motion for later**. When it lands, the card names the
choice that caused it — an effect you cannot trace back to a decision of your own reads as
bad luck, and bad luck teaches nothing.

At the end, a profile reports what was observed. **Finishing is the gate**
([ADR-0005](../docs/adr/0005-simulator-as-stage-zero-gate.md)): no threshold is applied to
prediction accuracy and nobody is excluded for playing badly.

## Architecture

**No build step, no dependencies, no network calls.** Plain ES modules, served as files.
A framework would cost more in kilobytes than it buys here, and learners pay for their
own data ([ADR-0002](../docs/adr/0002-mobile-first-offline-pwa.md)).

| File | Role |
|---|---|
| `js/engine.js` | Simulation. Computes the weekly P&L from state; drift, delayed consequences, prediction bands. |
| `js/i18n.js` | Language, string lookup and plurals. |
| `js/record.js` | The behavioural record — observations, indicators, profile. |
| `js/ui.js` | Rendering. One decision per screen. |
| `js/scene.js` | SVG graphics that reflect game state. |
| `js/storage.js` | Local-only persistence. |
| `js/main.js` | Chapter and turn state machine. |
| `js/carry.js` | The six flags that travel between chapters, and the rules bounding them. |
| `sw.js` | Service worker. Shell cache-first, content network-first with a cache fallback. |
| `content/chapters.json` | The chapter manifest. Loaded at startup; scenario files are fetched one at a time. |
| `content/scenario-*.json` | Scenarios, authored as **data, not code**, with both languages inline. |
| `content/ui.json` | Interface strings, key-major so the languages sit side by side. |

**The weekly P&L is computed, never authored.** Content supplies decisions and their
effects on state; the economics fall out of that. If an author could hand-write outcomes,
the numbers would stop being internally consistent and the learner would be memorising a
story rather than reasoning about a system.

Scenarios being data is a hard requirement, not a convenience: it is what allows someone
with local business knowledge and no programming skill to write and review content.

## Tests

```bash
node scripts/test-engine.mjs        # economics, drift, consequences, owner time, carry
node scripts/validate-scenario.mjs  # every option's declared prediction, on every path
node scripts/validate-i18n.mjs      # no missing strings in either language, every chapter
node scripts/simulate-runs.mjs      # plays every chapter five ways and prints the numbers
node scripts/smoke-app.mjs          # drives the real app against a stub DOM
node scripts/playthrough.mjs        # plays every chapter to the end, both languages, -v for detail
bash  scripts/check-links.sh
```

`simulate-runs.mjs` exists because `validate-scenario.mjs` has twice reported a clean
scenario that contained a dead business — demand run to zero, and costs compounded to
-900,000. Band stability says nothing about viability. **Read its output**, do not just
check that it exited 0.

`smoke-app.mjs` drives the actual application against a minimal stub DOM. It cannot see
layout, colour or whether a control is reachable with a thumb — nothing here can, there is
no browser in this environment. What it does catch is the class of failure that once
rendered every scene as a solid black rectangle: wiring that type-checks and does not
work.

`playthrough.mjs` is the companion to it, and shares its stub DOM
(`scripts/lib/stub-dom.mjs`). Where `smoke-app.mjs` checks the wiring at a few chosen
points, this one opens every chapter, presses every control to the end, in English and in
Kiswahili, and reads what the screens say: no broken value, no unfilled placeholder, no
untranslated key, no dead button, no screen without a way forward, and every column of
figures adding up to the total under it. It found six live defects on the day it was
written, including a work-it-out card that priced a bakery's bread at the mandazi stall's
500 shillings and a chapter list that threw a run away.

It still cannot see layout, colour or a tap target. **Nothing here can.**

`test-engine.mjs` covers the economics and — importantly — asserts that the generated
profile contains no score, rank or percentile field, and that its statements stay
observational. Those guardrails come from [`../docs/assessment.md`](../docs/assessment.md)
and are the easiest thing to erode by accident.

`validate-scenario.mjs` checks that each option's declared `predictAnswer` matches what the
engine actually computes, on every path through the scenario. If they disagree the learner
is marked wrong for being right. **It checks band stability, not viability** — it will not
notice a business that has been driven to a dead state, which has happened once.

Each chapter is graded against **its own band edges** ([D-018](../memory/DECISIONS.md)),
declared as `bands` in the scenario file. An edge must fall in a gap between clusters of
outcomes; put one inside a cluster and an option's band starts depending on the path the
learner took to reach it, which the validator then rejects as unstable — correctly.

`validate-i18n.mjs` exists because `t()` returns the key itself when a string is missing, so
a gap ships as a literal `pnl.sales` on screen without throwing — which is invisible in a
language you do not read.

## Known gaps

- **All money figures are placeholders.** The in-app banner says so. Real Tanzanian
  costs, fees and prices are deliberately absent — see
  [`../docs/context/`](../docs/context/) for why inventing them would be worse than
  leaving them out.
- **The Kiswahili is a first draft.** It has not been checked by a first-language speaker,
  and `docs/localization.md` is explicit that register is a judgement call for someone who
  is. The app says so on screen in Kiswahili mode. See
  [Q-015](../memory/OPEN_QUESTIONS.md).
- **Nobody has seen this version on a real phone.** It is verified headlessly for behaviour
  and text, which does not catch layout.
- **Offline is untested on a real device.** `sw.js` caches the shell and falls back to a
  cached chapter, and `smoke-app.mjs` checks every pre-cached path exists — but nobody has
  yet installed the app on a phone, turned the connection off and played a chapter.
- **Far-transfer testing** — the same concept in an unfamiliar business — is now possible
  across four chapters but is not implemented.
- **No pre/post or delayed retest**, both of which the assessment design calls for.
- **Prediction is single-metric** (weekly profit). Richer prediction targets would give a
  better signal.

## Open questions this does not resolve

Playing it should inform [Q-001](../memory/OPEN_QUESTIONS.md) (who is this for),
[Q-004](../memory/OPEN_QUESTIONS.md) and [Q-013](../memory/OPEN_QUESTIONS.md) (how long
should it be), [Q-014](../memory/OPEN_QUESTIONS.md) (are the prediction bands intuitive) and
[Q-011](../memory/OPEN_QUESTIONS.md) (does this actually hold anyone's attention).

That last one is the real purpose of the prototype. The argument for "compelling rather
than fun" is an argument, not evidence — it needs someone to sit with it and get bored,
or not.
