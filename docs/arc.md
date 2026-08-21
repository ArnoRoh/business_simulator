# The four-chapter arc

> **Status:** design, written 2026-08-08. Governs the content built in chapters 2–4.
> Ratified by [ADR-0007](./adr/0007-four-chapter-arc.md). Chapter 1 already exists as
> `app/content/scenario-mama-asha.json`.

One character, Asha, across four businesses. Each chapter is a self-contained
playthrough of 20 turns with an authored starting state. What travels between them is
narrative and a short list of carried flags — not the full simulation state.

---

## 1. Why four chapters and not one long one

Chapter 1 teaches a learner to see their own numbers. That is the right first job and it
is nearly the whole job for a livelihood firm. It is not enough for the thing this
project is actually about.

`AGENTS.md` §2 sets the target: the **livelihood/transformational** distinction, and the
common failure of *a founder who cannot build beyond themselves*. A stall cannot teach
that failure, because a stall never demands it. The capabilities that separate a firm
that grows from one that does not — financing an asset, managing working capital,
delegating with accountability, finding the one binding constraint, meeting a standard
someone else sets — only become real when the business is big enough to be broken by
getting them wrong.

So the arc is not "the same lessons with bigger numbers". Each chapter changes what
*kind* of thing the learner is running, and therefore what can kill it.

| Ch | Business | The shift | What kills you here |
|---|---|---|---|
| 1 | Mandazi stall | Seeing your own numbers | Not knowing your margin |
| 2 | Bakery | A person who sells → a business that runs | Running out of cash while profitable |
| 3 | Factory | A business that runs → an organisation | Building capacity you cannot fill or supervise |
| 4 | Export | An organisation → a firm competing outside its own market | Meeting someone else's standard, in someone else's currency |

The four are deliberately *not* a ladder every learner should climb. Chapter 1 ending
well is a complete and legitimate outcome — see `AGENTS.md` §2 and
[Q-006](../memory/OPEN_QUESTIONS.md). The chapter select screen says so in as many
words, and no chapter is locked behind another.

## 2. Continuity: bounded start, carried flags

Each chapter opens on an **authored `startState`**. This is the decision that keeps the
whole thing testable: `validate-scenario.mjs` walks paths from a known opening, and a
chapter seeded by an arbitrary ending state has no known opening to walk from. It also
means a learner can play chapter 3 without having played chapters 1 and 2, which matters
for a tool used inside a programme with limited contact time.

What carries is a small, closed set of **flags** — facts about how the previous chapter
was played, not its numbers:

| Flag | Set when | Read by |
|---|---|---|
| `keepsRecords` | The learner chose to keep proper books | 2, 3, 4 — a lender asks to see them |
| `formality` (0–3) | Registration reached in the previous chapter | 2, 3, 4 — starting formality level |
| `tookCredit` | Financed growth with borrowing rather than savings | 2, 3 — the opening debt position |
| `builtTeam` | Hired and delegated rather than working more hours | 3 — whether a supervisor already exists |
| `heldStandard` | Passed the quality/hygiene decisions cleanly | 3, 4 — certification starts part-done |
| `concentrated` | Ended reliant on one large customer | 3, 4 — the opening customer book |

Rules that keep this from becoming state-carry by the back door:

- **The set is closed.** Six flags, listed above and in the contract. A chapter may not
  invent a seventh without an entry in `DECISIONS.md`.
- **Flags tint, they do not gate.** A carried flag may change the opening situation text
  and modify at most two turns in a chapter. It may never make a chapter unplayable, and
  it may never change a `startState` number by more than the authored `carry` block
  allows.
- **Absent flags are legal.** A learner starting at chapter 3 has none. Every chapter
  must read correctly with an empty carry.
- **Carried flags are observations, not scores.** They travel in the record as facts
  about what was done. Nothing sums them.

## 3. Simplifying the interaction

Your instruction was to keep the interaction more basic and put the depth into the
content. Three changes:

1. **`workout` becomes opt-in.** Today every turn runs
   `situation → info → decision → work it out → prediction → reveal`. The work-it-out
   step exists because estimating a profit figure was too hard ([Q-017](../memory/OPEN_QUESTIONS.md),
   session 007), so removing it wholesale would undo a fix that has not yet been tested.
   It stays, declared per turn (`"workout": true`), and is required on any turn asking
   for a numeric profit prediction. Elsewhere the loop is
   `situation → info → decision → prediction → reveal`.
2. **Choice is the default control.** Numeric input is reserved for turns where a number
   genuinely *is* the decision — a price, a wage, a quantity, an order size. Chapters 2–4
   each use at most six numeric turns and one allocation, matching chapter 1.
3. **No new control types.** Everything below is expressed with the four that already
   exist: choice, number, allocate, diagnose. Where an advanced concept needs new
   machinery, it goes in the **engine**, where it produces consequences the learner reads
   in the ledger — not in a new widget they have to learn to operate.

The last point is the load-bearing one. Working capital is taught by cash and profit
visibly diverging in the panel the learner already reads, not by a working-capital
slider.

## 4. Engine extensions

Every field below defaults so that a scenario not using it behaves exactly as today.
Chapter 1 must be bit-identical after these land, and `test-engine.mjs` asserts it.

| Concept | State | Effect on the ledger |
|---|---|---|
| **Product mix** | `lines[]` of `{id, price, unitCost, demand, capacity}` | `weeklyPnl` sums lines; absent → one implicit line from the flat fields. Makes contribution margin per product visible, and the high-revenue/low-margin trap real. |
| **Depreciation** | `assetValue`, `assetLifeWeeks` | A weekly cost with no cash movement. The oven wears out in a good week too. |
| **Debt** | `debt`, `interestRate`, `repayPerWeek` | `interest` is a cost; `repayPerWeek` is cash out that is **not** a cost. The clearest possible demonstration that profit and cash are different things. |
| **Working capital** | `debtorWeeks`, `creditorWeeks`, `inventoryWeeks` | Cash movement lags profit by the cash conversion cycle. Growing fast now *consumes* cash, which is the thing that kills chapter 2 and 3 businesses. |
| **FX** | `fxShare`, `fxRate`, `fxDrift` | Part of revenue earned in another currency, at a rate that moves. |
| **Landed cost** | `dutyRate`, `freightPerUnit` | Per-unit costs that only exist on exported volume. |

The single most consequential change: `advanceWeek` currently does `cash += profit`. It
becomes `cash += cashFlow`, where `cashFlow` equals `profit` exactly when all the new
fields are at their defaults. Chapter 1 is therefore untouched, and chapters 2–4 get the
lesson that "profitable" and "solvent" are different words.

## 5. Chapter 2 — Asha's Bakery

**Opening.** Asha has taken a small premises with a second-hand oven. She sells over the
counter, and two shops have asked to buy from her wholesale. She has one employee.

**The shift.** She stops being the business and starts running one. The number of things
happening exceeds the number she can personally watch, and money starts arriving on a
different schedule from the work that earned it.

**What kills you.** Trading profitably straight into an empty bank account.

| # | Concept | The decision |
|---|---|---|
| 1 | Cost structure and operating leverage | The oven turns costs fixed. What does that do to a bad week? |
| 2 | Break-even volume | How many loaves before the day pays for itself? *(number)* |
| 3 | Contribution margin by product | Bread sells most and earns least. Which line do you push? |
| 4 | Product mix | How much of the day's capacity goes to cake? *(number)* |
| 5 | Job costing and overhead | A customer wants 200 for a wedding. What do you quote? *(number)* |
| 6 | Trade credit given | The shops want 30 days. Do you agree, and at what price? |
| 7 | Working capital | *(diagnose)* Profit is up and the bank balance is down. Which line explains it? |
| 8 | Supplier terms | Flour cheaper for cash, or dearer on account? |
| 9 | Financing an asset | A second oven: save for it, borrow for it, or lease it? |
| 10 | Cost of capital | What size loan can this business actually service? *(number)* |
| 11 | Depreciation | The oven is earning well and is worth less than last year. |
| 12 | Capacity utilisation and batch size | Two big bakes or five small ones? |
| 13 | Yield and wastage | Production waste is not the same problem as retail spoilage. |
| 14 | Hiring past the first employee | Second baker, or a supervisor for the one you have? |
| 15 | Standard procedure | Quality on the days Asha is not there. |
| 16 | Records a lender will accept | The bank asks for six months of books. |
| 17 | Formalisation | Business licence, TIN, food handling. What it costs and what it opens. `UNVERIFIED` |
| 18 | Seasonality | Ramadan and school terms move demand. Plan or react? |
| 19 | Setback | The big shop has not paid in nine weeks. |
| 20 | Capital allocation | *(allocate)* Repay the loan, buy stock, or pay yourself. |

## 6. Chapter 3 — The factory

**Opening.** A leased unit on an industrial plot, three production staff, one supervisor,
a delivery van, and a term loan. Asha now sells to distributors, not to people.

**The shift.** From a business she runs to an organisation that runs when she is not
looking. Decisions stop being about what to do and become about who decides.

**What kills you.** Capacity you cannot fill, or an organisation you cannot supervise.

| # | Concept | The decision |
|---|---|---|
| 1 | Unit economics at scale | Where cost per unit actually falls — and where it stubbornly does not. |
| 2 | Fixed cost absorption | A second line at 40% utilisation is worse than no second line. |
| 3 | The bottleneck | *(diagnose)* Mixing, baking, packing, delivery — which one caps output? |
| 4 | Removing one constraint | Spend on the bottleneck, or on the thing that feels most urgent? |
| 5 | Cash conversion cycle | Stock days plus debtor days minus creditor days. *(number)* |
| 6 | Input price risk | Wheat has moved 20%. Contract forward, or stay spot? |
| 7 | Inventory | Stockouts cost sales; stock costs cash. Where do you sit? *(number)* |
| 8 | Procurement scale | A volume contract with a price you cannot walk away from. |
| 9 | Organisation design | A production manager who is not you, with authority that is real. |
| 10 | Delegation with accountability | Set the target, or set the method? |
| 11 | Cost accounting | Standard cost against actual. Where did the variance come from? |
| 12 | Route to market | Own van, distributor, or agent — and the margin each costs. |
| 13 | Shelf space | A supermarket wants a listing fee against uncertain volume. |
| 14 | Payroll formality | What an employee really costs once PAYE, NSSF and WCF are in. `UNVERIFIED` |
| 15 | Safety and labour law | A guard on the mixer, and the week it costs to fit it. |
| 16 | Capex appraisal | Payback on a second line. What return justifies it? *(number)* |
| 17 | Certification | TBS certification and batch traceability. `UNVERIFIED` |
| 18 | Competitive pricing | A larger competitor undercuts you by 15%. Follow, hold, or differentiate? *(number)* |
| 19 | Setback | A batch fails at a distributor and has to be recalled. |
| 20 | Capital allocation | *(allocate)* Second line, new region, or repay debt. |

## 7. Chapter 4 — Export

**Opening.** A certified plant selling nationally, with one buyer in Nairobi asking for
regular volume and an enquiry from a distributor in the Gulf.

**The shift.** Competing on someone else's terms — their standard, their currency, their
paperwork, their payment schedule.

**What kills you.** A ninety-day cash cycle, a rejected shipment, or a currency move that
eats the whole margin.

| # | Concept | The decision |
|---|---|---|
| 1 | Why export | Which market, and on what evidence — or is this just flattering attention? |
| 2 | Landed cost | What the buyer actually pays, and how little of it reaches you. *(number)* |
| 3 | Incoterms | EXW, FOB, CIF — who carries the cost and who carries the risk. |
| 4 | Export pricing | Your domestic price is the wrong starting point. *(number)* |
| 5 | FX exposure | Paid in dollars, paying wages in shillings. |
| 6 | Hedging, or not | Forward cover costs money and removes a risk you may be able to carry. |
| 7 | Payment terms | Advance, letter of credit, or open account — price against risk. |
| 8 | Working capital for a long cycle | Ninety days between shipping and being paid. *(number)* |
| 9 | Trade finance | Borrowing against an invoice you have not been paid for. |
| 10 | Documentation | Certificate of origin, phytosanitary certificate, customs entry. `UNVERIFIED` |
| 11 | Destination standards | HACCP, ISO 22000, halal certification — cost, time, and what they open. `UNVERIFIED` |
| 12 | Packaging for transit | Shelf life and damage over six weeks at sea. |
| 13 | Freight economics | A part-container is a full container you paid for. *(number)* |
| 14 | Duties and preferential access | Regional and preferential arrangements. `UNVERIFIED` |
| 15 | Choosing a buyer | Exclusivity offered against volume promised. |
| 16 | Minimum order quantity | Their MOQ against your capacity and your domestic customers. |
| 17 | Quality failure abroad | A container rejected at the port of entry. |
| 18 | Brand or private label | Your name on it, or theirs and a bigger order. |
| 19 | Setback | *(diagnose)* Sales are at record levels and cash is worse than ever. |
| 20 | Capital allocation | *(allocate)* Across domestic, regional and export. |

## 8. What this deliberately does not do

- **No business-plan output.** Ruled out by [ADR-0004](./adr/0004-simulator-as-selection-instrument.md).
  Reaching chapter 4 is not a claim about anyone's real firm.
- **No composite score across chapters.** Four chapters make an aggregate score more
  tempting and no more defensible. The record stays three-layer and per-chapter.
- **No performance gate between chapters.** Completion carries a learner forward
  ([ADR-0005](./adr/0005-simulator-as-stage-zero-gate.md), D-008). Chapters are
  unlocked, in any order, always.
- **No invented regulatory detail.** Every fee, rate, licence name and threshold in
  chapters 2–4 ships marked `UNVERIFIED` and logged for local review, per `AGENTS.md` §6.
  There are a lot of them, and they are the most likely thing in this arc to be wrong.
