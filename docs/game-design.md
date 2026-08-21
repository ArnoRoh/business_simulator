# Game design

> **Status:** describes the application as built, as of 2026-08-09 (sessions 013 and 015).
> Everything under "The loop as built", "Structure of time", "Systems modelled",
> "Failure", "Interface" and "Content model" is behaviour you can play. Everything
> under "Designed and not built" is intent, and is marked as such.
>
> This file was written before there was any code and went a long way out of date while
> four chapters were authored against it. It is now reconciled against
> `app/js/engine.js`, `app/js/main.js` and `app/js/ui.js`. Two questions it does not
> answer remain open: [Q-001](../memory/OPEN_QUESTIONS.md) (learner segment) and
> [Q-004](../memory/OPEN_QUESTIONS.md) (session length).

How the simulation works. What it teaches is [`curriculum.md`](./curriculum.md); what it
records is [`assessment.md`](./assessment.md); how the four chapters relate is
[`arc.md`](./arc.md).

---

## The loop as built

```
 SITUATION ─► INFORMATION ─► [DIAGNOSE] ─► DECISION ─► WORK IT OUT ─► PREDICT ─► REVEAL
     │             │             │             │             │            │         │
     │             │             │             │             │            │         └─ before/after
     │             │             │             │             │            │            ledger, the
     │             │             │             │             │            │            changed line
     │             │             │             │             │            │            highlighted
     │             │             │             │             │            └─ graded, never scored
     │             │             │             │             └─ the arithmetic of the position now
     │             │             │             └─ committed: an option, a number, or a split
     │             │             └─ where content asks: which line caused this loss?
     │             └─ costs hours or cash to buy; never complete
     └─ a concrete problem in a specific business, not a lesson
```

Then the week passes, delayed consequences fire, the slow variables drift, and the next
situation arrives carrying what the last one did.

**Situation.** A specific problem in a specific business. "A lender asks for six months
of books before discussing a larger facility" — not "learn about record keeping." A turn
may carry one alternative opening for a learner who arrived with a particular carried
flag (`carryVariant`, capped at two turns per chapter by ADR-0007).

**Information.** Never complete and never free. Each item costs owner hours, cash, or
both, and what it reveals is authored. **Whether the learner buys information before
deciding is recorded as an observation** (`information-seeking` in
[`assessment.md`](./assessment.md)), so it has to be a real choice with a real cost.

**Diagnose.** On five turns across the four chapters, the learner reads the ledger and
names the line that caused a loss before they are allowed to act on it. The evidence
offered is of three kinds — a P&L row, a line of the cash statement, or authored
evidence with no figure attached at all (D-024).

**Decision.** One of three shapes:

| Shape | The learner does | Used for |
|---|---|---|
| **Choice** | Picks one of three options — always three | 14 turns in chapter 1, 15 in the rest |
| **Number** | Names a figure on a stepper — a price, a batch size, a wage | 5 in chapter 1, 4 in the rest |
| **Split** | Divides an amount between repaying, reinvesting, home and reserve | one turn per chapter, with the rest of the chapter still to run |

There is no undo. A number decision records the number itself, not which bracket it fell
in: the value is the evidence (D-011).

**Work it out.** An opt-in card that lays out the arithmetic of the current position —
one row per product where there is a mix, every cost the week actually charges, and a
total. It appears automatically wherever the prediction is a number. Every figure on it
must be one the business actually produces, and the column must add up to the profit it
claims; both are checked by `scripts/playthrough.mjs` because both were once false
(D-023).

**Predict.** Before the outcome, always. Either four bands — up a lot, up a little,
about the same, goes down — labelled on screen with the money each one covers, or a
numeric estimate of next week's profit graded close / near / off (D-012). Band edges are
per chapter and chosen to fall in a gap between clusters of outcomes (D-018).

**Reveal.** What happened, why, the lesson, and the ledger before and after with the
changed line highlighted. A wrong prediction gets an explanation, never a mark.

**Consequence.** Some arrive the same week. Some are queued for later — three weeks is
typical — and when they arrive they say which decision caused them. Immediate feedback
everywhere would teach the wrong model of how a business works.

---

## Structure of time

**Turn** — one simulated **week**. A turn may advance more than one week where the
content says so.

**Chapter** — one whole business, twenty authored turns, its own opening balance sheet
and its own prediction bands. Not a phase of one business: the stall, the bakery, the
factory and the export business are four chapters ([ADR-0007](./adr/0007-four-chapter-arc.md)).
Nothing is locked, nothing is summed, and a stall run well is a complete outcome. Up to
two **recovery turns** are spliced in on top of the twenty when cash goes below zero.

**Playthrough** — one chapter, start to record. Estimated at 30–40 minutes and never
measured with a learner ([Q-013](../memory/OPEN_QUESTIONS.md)). Every state is saved
continuously and resumable, including mid-decision; leaving a chapter for the chapter
list and coming back returns to the turn the learner stopped on.

**A goal** spans the run — three conditions, shown throughout, reported at the end and
never scored (D-013). Finishing is the gate (ADR-0005, D-008).

---

## Systems modelled

Only what teaches something, and all of it computed in `engine.js` rather than authored
as an outcome. Content supplies decisions and their effects on state; the economics fall
out. A scenario that does not mention a field gets a default under which that field
contributes nothing, which is how chapter 1's ledger stayed a stall's ledger while
chapters 2–4 were built (D-017).

**Cash, and profit as a different number.** Both are shown whenever they differ, with a
line saying why. This is the spine, and the gap between the two is most of what chapters
2 and 3 teach.

**Demand.** Pulled each week towards the level the business's reputation justifies, with
a floor and a ceiling — never compounding away to zero. With a product mix, every line
moves by the same proportion, because reputation belongs to the business and not to one
product. Unmet demand is shown: customers who wanted to buy and found nothing.

**Operations.** Capacity, per-line unit costs, and spoilage charged on unsold capacity
only. Capacity is bought in steps — an oven, a van — not in fractions.

**The owner's week.** Fixed overhead hours plus hours that scale with output, less hours
relieved per employee. Running past the total is not free: hygiene and reputation fall
in proportion to the overrun. This is what makes delegation a decision rather than a
topic.

**Quality.** Hygiene decays slowly towards a floor unless maintained, feeds reputation,
and reputation feeds demand on a lag — so a hygiene failure is felt weeks after the
decision that caused it.

**Fixed costs.** Rent, wages with payroll on-costs, licences and fees, depreciation over
an asset's working life, and interest on debt.

**Working capital.** Debtor, inventory and creditor weeks, held as a balance in state
and reconciled each week rather than re-derived — so it moves when the learner's own
decision moves it, and growth consumes cash faster than the growth earns it.

**Debt.** Principal, an interest rate that charges weekly, and a repayment that is cash
leaving without being a cost.

**Trade across a border.** A share of revenue priced in another currency, freight per
exported unit, and duty on exported value.

**Insolvency.** Cash below zero sheds what can no longer be funded — rent above the
opening level, a member of staff, fees, and capacity down to a floor. It shrinks the
business towards a stall and never to nothing.

**What the business is worth.** Cash, plus equipment at what it is worth now, plus stock
and money customers owe less money owed to suppliers, less debt. It is the only figure in
the game that is a *stock* rather than a week, and it sits under the weekly rows with the
amount it moved by since last week. Once a chapter has a loan it is joined by what the
lender is owed for every 100 that is the owner's, and by a warning when more is owed than
held. It counts nothing content did not record, which is why an option that spends cash on
something the business keeps has to say so (see "Content model").

**Deliberately not modelled:** double-entry accounting, HR administration, tax computed
to the shilling, market share dynamics. Compliance appears as its cash and fee cost and
as access it opens or closes, not as a tax engine.

---

## Failure

Firms fail. The simulation lets them, or nothing is at stake and no signal is generated.

Failure is a chapter boundary and not a game over. Cash below zero triggers a **recovery
turn** — collect what you are owed, cut back, or sell an asset — which is the situation
the scenario most needs to teach and the one a fail screen would skip. At most two per
chapter; after that the shedding above keeps the business shrinking rather than
spiralling.

**What a learner does after a setback is one of the most valuable observations in the
record** ([`assessment.md`](./assessment.md), "Recovery"), and it is recorded. A design
that prevented failure would destroy it.

---

## Interface

From `AGENTS.md` §3, restated as rules and now as behaviour:

- **One decision per screen.** Small screens, second-language readers, interruption.
- **Numbers shown as consequences, not tables** — with bars for magnitude, a cash runway
  in weeks rather than a ratio, and a twelve-week projection of where this is heading.
- **Every new ledger line introduces itself, once**, the first time the learner meets it
  on a panel they have open (D-025) — including what the business is worth, and the
  lender's claim on it.
- **Every state is resumable.** The app is saved on every action and assumes it will be
  killed mid-decision.
- **No timers, no real-time pressure.** Play happens in interrupted fragments.
- **Offline after first load**, via a service worker: shell cache-first, content
  network-first with a cache fallback (ADR-0002). Never yet tested on a device.
- **Assets budgeted.** No images, no fonts, no dependencies: the scenes are inline SVG
  and the whole application is vanilla ES modules (ADR-0006). A first load is roughly
  95 KB compressed — shell, interface strings and one chapter — and each further chapter
  is another 27–35 KB.
- **Localised at render time.** No string in code, no currency in content; both
  languages ship inline and a check enforces parity (D-009).

---

## Content model

Scenarios are **data, not code**, so that people with domain knowledge and no
programming skill can write and review them. This is what makes local ground truth
reachable, and it is a hard requirement.

One JSON file per chapter under `app/content/`, listed in `chapters.json`. A file
declares:

| Key | What it holds |
|---|---|
| `startState` | The opening balance sheet: cash, rent, staff, product lines, terms |
| `bands` | This chapter's prediction edges (D-018) |
| `carryIn` | Opening overrides and a note, per carried flag. **Absolute values, not deltas** |
| `goal` | Three conditions, reported and never scored |
| `turns[]` | Situation, information items, an optional diagnose step, and a decision |
| `recovery` | The turn spliced in when cash goes below zero |
| `unverified` | Chapter- or turn-level: puts a banner on screen saying the figures are unchecked |

An option declares its `effects` on state, its `predictAnswer`, its `outcome` and its
`lesson`, and optionally `later[]` — consequences due in *n* weeks, each carrying the
cause it will name when it arrives. **Signed effects (`"+60"`, `"-0.045"`) are deltas;
unsigned numbers are absolute sets** (D-022). A `carryIn` override is not an effect and
is always absolute — authoring one as a delta opened the factory on a negative interest
rate, and `validate-scenario.mjs` now rejects it.

Two rules follow from the worth figure, and neither can be fully checked by a script:

- **An option that spends cash on something the business keeps records it** with
  `assetValue` (D-031). Buying a fryer is not the same event as paying a licence fee, and
  without the asset the panel reads a capability investment as money destroyed.
- **Stock is not recorded twice.** In a chapter with `inventoryWeeks`, buying stock is
  already carried by working capital; adding `assetValue` as well would count it in two
  places.

**Where the split sits matters.** Each chapter's allocation turn — repay, reinvest, take
home, hold as reserve — is deliberately *not* the last turn. It is turn 17 in chapter 1
and 14, 13 and 15 in the others, so that whatever leaves the business is money the
business does not have for the weeks that follow (D-032). A split on the final turn costs
nothing, because nothing follows it.

Every scenario file is checked by `scripts/validate-scenario.mjs`: declared predictions
against computed ones, band stability across 400 random paths, numeric controls that can
reach their own answer, carry rules, and localisation parity. Adding a decision type
touches four places — the engine resolver, the renderer, the phase machine in `main.js`,
and the validator.

---

## Designed and not built

Named here rather than deleted, because each was a deliberate design position and the
reasons still hold. None of it is in the application today.

**The free-text bottleneck question.** The original design asked the learner, in their
own words, what one thing was holding the business back, and compared what they *said*
was binding with what they *funded*. Nothing asks this. `record.observeConstraint()`
exists in `app/js/record.js` and is called by nothing. What the application has instead
is chapter 3's bottleneck turns and the diagnose step, which are recognition tasks
rather than free statements. The comparison the original design wanted — said versus
funded — is not available from what is recorded today.

**Trajectory choice.** The design had the learner choose at the start between
consolidating a livelihood business and building a transformational one, with the
scenario's goals and options following that choice. There is no such choice. The four
chapters carry the distinction differently: chapter 1 ending well is stated to be a
complete outcome, and no chapter is locked behind another ([`arc.md`](./arc.md) §1).
[Q-006](../memory/OPEN_QUESTIONS.md) is unresolved either way, and
[`assessment.md`](./assessment.md)'s "trajectory-aware" profile property is unbuilt for
the same reason.

**Random shocks.** Consequences are authored and scheduled, never randomised. What looks
like a shock — chapter 3's recall, chapter 4's quality failure abroad — is a turn
somebody wrote. This is deliberate: a delayed consequence that names its cause teaches;
a random one that does not is noise, and it would also make band stability unprovable.

**Facilitator-assisted mode**, which [`assessment.md`](./assessment.md) requires before
any real selection use.

## Open

- **[Q-001]** Segment — the starting state and scenario scope still assume an existing
  small firm with traction.
- **[Q-004] / [Q-013]** Length — 20 turns of this depth is a guess nobody has timed.
- **[Q-026]** The arc's mechanical depth peaks at chapter 2 and plateaus. Intended?
- Unresolved: how much simulation state a learner should be able to inspect, and whether
  facilitator-led group play is a v1 mode.
