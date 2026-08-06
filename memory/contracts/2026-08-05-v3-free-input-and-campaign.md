# v3 interface contract — free-input decisions and a goal-driven campaign

This is the **binding contract** between three agents working in parallel on
`/srv/repos/business_simulator`. Implement exactly what is written here. If something is
underspecified, implement the simplest thing consistent with the rest and write a comment
saying you did — do not invent new field names, and do not change a signature another
agent depends on.

## Why this change exists

The owner played v2 and said: *"it seems to be the same game as the original with just
some additional UI portions?"* They were right. The loop is still read-a-paragraph,
pick-one-of-three, guess a direction. Everything v2 added was output — things to look at,
not things to do.

v3 changes what the learner **does**: they supply numbers, they diagnose, and they steer
toward a goal across the whole run.

Read `AGENTS.md` §2 and §6 before writing anything. Two rules bite constantly:

- **Content is data, never code** (ADR-0006). Free-input decisions therefore carry
  *declarative response curves*, never formulas or expressions.
- **The completion gate stands** (D-008, ADR-0005 `Accepted`). The goal steers the learner
  during play. It is reported at the end as an **observation**, never as a pass mark, a
  score, or a rank. `scripts/test-engine.mjs` asserts the profile has no score/rank/
  percentile field and that statements stay observational. Do not weaken those.

## Current state

Branch `claude/simulator-v2-depth-and-swahili`, all four checks green:
`node scripts/test-engine.mjs` (74), `node scripts/validate-scenario.mjs` (60/60),
`node scripts/validate-i18n.mjs`, `bash scripts/check-links.sh`.

**Do not run `git commit`, `git push`, or `git checkout`.** The integrator commits.

---

## 1. Decision types

`turn.decision.type` is `"choice"` (default, the existing behaviour) or `"number"` or
`"allocate"`. Existing turns have no `type` field and must keep working untouched.

### 1.1 `type: "number"`

The learner sets a value directly.

```json
"decision": {
  "type": "number",
  "prompt": { "en": "...", "sw": "..." },
  "predict": "number",
  "input": {
    "field": "price",
    "min": 300, "max": 900, "step": 25,
    "start": "current",
    "valueAs": "money",
    "hint": { "en": "You pay {cost} to make each one.", "sw": "..." },
    "responses": [
      { "field": "demand", "perStep": 25, "change": -12 }
    ]
  },
  "bands": [
    { "upTo": 420, "outcome": {...}, "lesson": {...} },
    { "upTo": 700, "outcome": {...}, "lesson": {...} },
    {              "outcome": {...}, "lesson": {...} }
  ]
}
```

- `field` — the state field the learner sets. `valueAs` is `"money"` or `"count"` and
  only controls formatting.
- `start` — `"current"` (use `state[field]`) or a literal number.
- `responses` — how *other* state fields move. For each response:
  `delta = ((value - startValue) / perStep) * change`, applied **additively**.
  Round to the nearest integer. This is the only permitted way for content to express a
  relationship; there is no expression language and there must never be one.
- `bands` — narrative for ranges of the **chosen value** (not of the profit change).
  First band whose `upTo` is `>= value` wins; the last band may omit `upTo` and is the
  fallback. Every band needs `outcome` and `lesson`, both `{en, sw}`.

### 1.2 `type: "allocate"`

The learner splits an amount between buckets.

```json
"decision": {
  "type": "allocate",
  "prompt": {...},
  "predict": "number",
  "allocate": {
    "amountFrom": "cash",
    "fraction": 0.6,
    "step": 10000,
    "buckets": [
      { "id": "business", "label": {...}, "perStep": { "capacity": 8, "demand": 5 } },
      { "id": "home",     "label": {...}, "perStep": {} },
      { "id": "reserve",  "label": {...}, "perStep": {}, "keepsCash": true }
    ]
  },
  "bands": [ ... ]
}
```

- Total to allocate = `round(state[amountFrom] * fraction / step) * step`, minimum 0.
- Effects: for each bucket, `units = allocatedAmount / step`, and each `perStep` entry is
  multiplied by `units` and applied additively.
- Cash falls by everything **not** in a `keepsCash` bucket.
- `bands` here are selected on the **fraction sent to the first bucket** (0–1), using
  `upTo` the same way.

### 1.3 `turn.diagnose` — optional, any turn type

Runs **before** the decision, on any turn. Not a decision type.

```json
"diagnose": {
  "prompt": {...},
  "answer": "pnl.spoilage",
  "options": ["pnl.sales", "pnl.costOfSales", "pnl.rent", "pnl.spoilage"],
  "right": {...},
  "wrong": {...}
}
```

`options` and `answer` are **ledger row keys** — the same keys `ui.js` already uses in
`ledgerRows()` (`pnl.sales`, `pnl.costOfSales`, `pnl.rent`, `pnl.wages`, `pnl.fees`,
`pnl.spoilage`). The learner picks the line they think is the problem.

---

## 2. Engine API — agent 1 owns this

Add to `app/js/engine.js`. Keep every existing export working unchanged.

```js
/** Effects object for a numeric input. Pure; does not mutate state. */
export function resolveNumberInput(state, input, value) -> effects

/** Effects object for an allocation. `split` is { bucketId: amount }. */
export function resolveAllocation(state, allocate, split) -> effects

/** Total available to allocate, rounded to `step`. */
export function allocationTotal(state, allocate) -> number

/** Which band of `bands` applies to a chosen value. Returns the band object or null. */
export function bandForValue(bands, value) -> band | null

/**
 * Grade a numeric prediction of weekly profit.
 * error = |predicted - actual| / max(2000, |actual|)
 *   error <= 0.10 -> { grade: 'close', correct: true  }
 *   error <= 0.25 -> { grade: 'near',  correct: false }
 *   else          -> { grade: 'off',   correct: false }
 * Returns { grade, correct, error, predicted, actual }.
 */
export function gradePrediction(predicted, actual) -> result

/** How many weeks of rent + wages + fees the current cash covers. */
export function weeksOfCostsCovered(state) -> number

/**
 * Evaluate scenario.goal against state.
 * Returns { conditions: [{ id, met, current, target }], metCount, total }.
 * A condition is { id, label, field, min } or { id, label, metric, min } where
 * metric is currently only "weeksOfCostsCovered".
 */
export function evaluateGoal(state, goal) -> progress

/** True when the business is in trouble and needs a recovery turn. Cash below zero. */
export function needsRecovery(state) -> boolean
```

Also extend `app/js/record.js`:

- `observePrediction` gains optional numeric fields. When a prediction is numeric, store
  `predicted`, `actual`, `error`, `grade` alongside the existing `correct`.
- `observeDiagnosis(record, turnId, picked, answer, correct)` — new observation kind
  `'diagnosis'`.
- `observeInput(record, turnId, field, value)` — new observation kind `'input'`, so the
  behavioural record captures **what number the learner chose**. This is the whole point
  of v3 for the selection signal (ADR-0004): a free decision is far stronger evidence of
  execution than picking one of three.
- A new indicator `diagnosis(record)` in the same shape as the others, with evidence.
- `buildProfile` gains a statement for diagnosis when there is any, and one for goal
  progress if `record.goalProgress` is set. **Both must stay observational** — say what
  happened, never what it implies about the person.

Extend `scripts/test-engine.mjs` to cover every new export, and
`scripts/validate-scenario.mjs` to handle the new types: for `number` and `allocate`
turns, sweep the input range across all three robot paths and assert the outcome is finite,
that profit responds monotonically where a response curve says it should, and that every
value maps to a band. Existing band checks for `choice` turns must keep passing.

## 3. UI API — agent 2 owns this

Add to `app/js/ui.js` and `app/css/styles.css`. Every string via `t()`; add new keys to
`app/content/ui.json` **in both languages** — coordinate by only adding keys under the
prefixes listed in §5.

```js
/** Big +/- stepper. Mobile-first: 48px targets, no typing required. */
export function renderNumberDecision(container, turn, state, onCommit)
export function renderAllocateDecision(container, turn, state, onCommit)
export function renderDiagnose(container, turn, state, onAnswer)

/** Numeric prediction: a stepper anchored at the current weekly profit. */
export function renderPredictNumber(container, turn, state, onPredict)

/** Persistent goal panel — conditions with met/unmet, never a score. */
export function renderGoal(container, progress, goal)
```

Requirements that are not negotiable:

- **No typing.** Steppers with large `+`/`−` buttons, plus a coarse `++`/`−−` at 5 steps.
  The design target is a cracked screen and imprecise input (`docs/localization.md`).
- **Live feedback while stepping.** For a price input, show what it means per unit as the
  value moves — "you keep {kept} on each one". Never make the learner compute
  (`docs/localization.md`: if they must compute to see a consequence, show the computation).
- **Never colour alone** to convey state.
- **Respect `prefers-reduced-motion`** — the existing block in `styles.css` uses `*`, keep
  it covering anything new.
- Reuse `animateNumber` and `pulse` from `scene.js`; do not add another animation helper.

## 4. Content — agent 3 owns this

`app/content/scenario-mama-asha.json`. Convert **only** these turns; leave every other turn
exactly as it is:

| Turn | Concept | Becomes |
|---|---|---|
| t01 | unit-economics | `number` — set your price. Responses: demand falls as price rises. |
| t02 | pricing | `number` — set your price against the cheaper competitor. |
| t12 | owner-time | `number` — hours a week set aside to work *on* the business. |
| t13 | hiring | `number` — how many people to take on. |
| t19 | negotiation | `number` — what discount to offer the hotel. |
| t20 | reinvestment | `allocate` — split the profit between business, home and reserve. |
| t11 | setback | keep as `choice`, but add a `diagnose` step — which line caused the loss. |

Add `scenario.goal` with three or four conditions the learner can actually reach in 20
turns: registered, able to make enough for the hotel order, and a cash reserve. Add
`scenario.recovery` — a turn-shaped object used when cash goes negative, offering real
ways out (borrow at a cost, cut back, sell equipment). Recovery is a **chapter boundary,
not a game over** (`docs/game-design.md`).

Every new string needs `{ "en": ..., "sw": ... }`. The Kiswahili is a draft pending review
(Q-015) — match the register already in the file: keep common business loanwords, short
sentences, second-language reader.

Response curves must be **plausible, not dramatic**: a price rise should lose customers at
a rate that makes the margin trade-off genuinely finely balanced, so there is a real
decision rather than an obviously right answer.

## 5. File ownership — do not cross these lines

| Agent | Owns | Never touches |
|---|---|---|
| 1 — engine | `app/js/engine.js`, `app/js/record.js`, `scripts/test-engine.mjs`, `scripts/validate-scenario.mjs` | ui.js, main.js, css, content |
| 2 — UI | `app/js/ui.js`, `app/css/styles.css`, and **only** `ui.json` keys prefixed `num.`, `alloc.`, `diag.`, `goal.` | engine.js, record.js, content/scenario-*, main.js |
| 3 — content | `app/content/scenario-mama-asha.json`, and **only** `ui.json` keys prefixed `recovery.` | all js, css, scripts |

`app/js/main.js` belongs to the integrator. Nobody else edits it.
`app/standalone.html` is generated — never edit it by hand.

## 6. Definition of done

Your slice is done when the checks you own pass and you have said plainly what you did not
finish. Do not report success for work you did not verify by running it. If you hit
something that contradicts this contract, stop and say so rather than working around it.

---

## Postscript, added at integration

Kept as the record of what was actually issued to the three agents in session 006. It is
reproduced unchanged above, including its gaps — two interfaces were missing and had to be
sent as mid-flight addenda:

1. **`renderReveal`** had to serve three decision types and two prediction kinds. Its
   signature changed and this contract did not say so.
2. **DOM test hooks** (`data-control`, `data-step`, `data-role`, `data-bucket`,
   `data-condition`) were never specified, so the headless harness would have had nothing
   stable to drive.

Both are the same lesson, and it is the one worth carrying forward: a changed signature and
a verifier's requirements are *interfaces*, and belong here rather than in a follow-up
message. See [`docs/agent-orchestration.md`](../../docs/agent-orchestration.md) §4.1.
