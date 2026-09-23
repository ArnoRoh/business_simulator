# MV-BS-DES-002 — One continuous business: consolidated game design

**Business Simulator · Masika Ventures**

**Status:** Approved implementation direction, 2026-09-23. Local implementation complete;
prototype timing and commercial assumptions remain provisional. Not field validated.

**Date:** 2026-09-23

**Decision record:** [ADR-0014](./adr/0014-continuous-business.md).
Consolidates the two parallel proposals and their review. [MV-BS-DES-001](./MV-BS-DES-001-continuous-business.md)
remains a historical proposal. The owner subsequently accepted this direction and
requested implementation with Opus 5.5, including animations.

**Replaces in the current source:** the thirteen-step introduction (ADR-0013) and the four-chapter
structure (ADR-0007) as the main game. Existing records stay readable (section 10).

All amounts in this document are **sample figures**. They show the shape of the design.
They are not verified local prices. Local review must set them before any learner test.

---

## 1. Recommendation and scope

The player runs **one food business through a complete operating season**. It starts as a mandazi
stall at a bus stand. There are no chapters. The business changes form only when the
player's decisions change it: it can stay a good stall, or it can become a small
kitchen that supplies other businesses and runs without the owner. Each week the
player sees **Buy → Cook → Sell**, with **Collect** returning payment to the next
purchase. Queues, unsold trays, unused equipment and unpaid invoices show constraints.
Most weeks need one tap, because the plan stays in place until the player changes it.
Events interrupt the week with a short decision. Consequences carry
forward through specific named customers, debts, dates, equipment and people. Depth
comes from these connections, not from text.

The continuing objective is: **make the business support you, meet its promises and
operate in the way you want.** The first scope uses one product family, two customer
channels and a small team. This is a proposal to test, not a claim of enjoyment,
learning or predictive validity.

The proposed prototype uses 24 simulated weeks to test overlapping obligations and
several payment cycles. This is a test schedule, not an accepted duration or decision
count. The final scope must allow an experiment, a commitment, a setback, a response
and enough later trading to experience its consequences. Section 6 gives the candidate
schedule. Its dates are transparent to the player; they are not hidden lesson triggers.

---

## 2. Player role, motivation and continuing objective

**Role.** The player is the owner ("you"). The game does not give the player a
character, a founder type or a back story. Customers, suppliers, a helper and a lender
have names, so that debts and relationships are specific.

**Motivation.** The business must support a household. Two things create a personal
stake from the first minute:

1. **Household money each week.** The player sets how much the household takes from
   the tin (sample default 1,500). If the tin cannot pay it, the household goes short.
   The game shows this plainly. It does not dramatise it.
2. **One large dated payment.** A household payment is due in prototype week 8
   (sample 9,000), with another in week 20. The player can optionally name its purpose
   after play starts. No personal household data is requested. These dates are on a
   calendar strip that is always visible.

Taking money home is a legitimate goal. Missing a payment is a simulated constraint,
not a judgement of the player or a reason to dramatise household distress.

**Continuing objective.** Keep the business open, pay the household and the dated
payments, and reach **one goal the player chooses** at the end of month 1. The goal
cards use business facts, not ambition labels:

| Goal card | Reached when |
|---|---|
| A safe household income | Household paid every week for 8 weeks, and 4 weeks of household money saved |
| Regular business customers | 3 business customers buy each week and pay on time |
| A business that runs without you | The business trades a full week while you are away, and the tin, stock and records agree |

These numerical goal targets are prototype settings. The player can change the goal
at any month close. The record keeps each change as a stated preference. No goal is
worth more than another. The game does not rank them or require a goal to be achieved
before the player can review or finish a run.

Attachment comes from recurring customers, an operation the player has built and
unfinished questions: will the buyer reorder, will a payment arrive, will the helper
handle the next delivery? Keep the same business state throughout; do not reset its
budget to make the next scene convenient.

---

## 3. The central loop

### 3.1 One week

1. **The board.** Four tiles show the business. Introduce each control when it is
   needed. The opening has a ready plan, not a setup form.

   | Tile | Control | Example |
   |---|---|---|
   | Buy | Amount of flour and oil, and cash or supplier credit | 2 bags, cash |
   | Cook | Trays per day, up to the cooking limit | 5 trays |
   | Sell | Price step and the list of sales channels | Normal price; stall |
   | Collect | Customer balances, payment dates and follow-up | Mama Neema; due Friday |

   A strip across the top shows cash, the next payment due and **your hours**.
   Household withdrawals sit beside the cash balance. Activities use the relevant
   person's hours; delegation can release owner time. The plan stays until changed.

2. **Run the week.** One large button names the interval it advances. The scene
   briefly shows trading days: customers arrive, trays empty, people leave, leftovers
   go to waste and coins enter the tin. Animation is skippable. Reduced motion shows
   the same result with labelled changes. No event depends on tapping speed.

3. **Interruptions.** At most one or two per week, and many weeks have none. The day
   strip stops. A named person asks for something: "Mama Neema asks to pay on Friday."
   The player answers with two or three direct actions. There is no correct-answer
   feedback. The week continues.

4. **The week card.** Always show sales, profit and the tin's start and end values.
   Compare **profit** with **change in cash**, with an optional breakdown for stock,
   customer debts, supplier debts, collections, borrowing, interest, principal payments
   and household withdrawals. This is teaching feedback produced by the simulation,
   not proof that the player calculated or recorded it independently. The board shows
   symptoms of constraints. The opening can highlight the limiting stage; after that,
   a labelled help action provides the highlight and is recorded as assistance.

5. **Continue.** Tap "Next week", or "Run until something needs me". The second
   button runs routine weeks until an event, a dated payment, a shortage or a month
   close. Show the interval and stop before a commitment needs a response. Nothing
   advances while the app is closed. Known costs and terms are visible before commitment;
   unknown demand and payment behaviour are not presented as exact forecasts.

### 3.2 Month close

Every four simulated weeks a review shows the period: sales, profit, cash, what is owed
in both directions, hours worked and progress toward the chosen goal. It also shows
**consequence threads**: short lines that link an earlier decision to a later result,
for example "Week 6 credit delivery: 4,200 was received in week 8." Link to the actual
events. Do not present a notebook or a decision as the sole cause of a result unless
the model establishes that relationship. The review is available without a notebook.

A month close is a natural place to stop. The game saves at every step anyway.

### 3.3 Records are a mechanic, not a lesson

Keeping the notebook takes a small, stated amount of owner time. One evening per week
is a prototype assumption to test, not a verified local cost. It can later be delegated.
Basic sales, cash, profit and current commitments are always visible. Known debts can
always be followed up; the notebook does not unlock collection or alter what is owed.

The notebook preserves transaction-level history: customer, amount, due date, delivery
slip and payment. A player can match a receipt to an invoice, compare dispatch with
accepted quantities or investigate a discrepancy. Records make these tasks quicker
and more reliable as transactions accumulate. A lender can ask for the history, but
keeping it does not guarantee a loan.

Without a maintained notebook, old customer or batch detail can be incomplete in the
business view. Label missing detail as unknown; allow reconstruction from remaining
receipts or a conversation with the counterparty, with a stated time cost and limits.
Do not randomly erase debts, invent false memories or ask a scored question whose
answer is unavailable. Turning on the notebook records future transactions; it does
not conjure a complete past. A delivery slip supports a payment query but guarantees
neither payment nor verification of real activity.

The player's full simulation audit trail remains available regardless. It is a learning
record, not a substitute for simulated documentary evidence a buyer or lender requires.
Never claim that buying the notebook option shows independent bookkeeping ability.

### 3.4 How decisions change the business

Production and delivery have connected limits:

- **Buy** is limited by cash, supplier credit and storage.
- **Cook** is limited by pots, cooking hours and helpers.
- **Sell** is limited by demand at the price, channels and serving time.
- Packing and delivery can become additional limits when business orders require them.

Fulfilled sales are limited by available goods, demand and delivery capability.
**Collection is a delayed cash flow, not a cap on current sales.** A credit delivery
creates sales and an amount owed by the customer. Payment later increases cash and
reduces that amount; it does not create a second sale. Lack of cash can prevent the
next purchase even while this period is profitable.

```text
Cash → Buy → Stock → Cook / pack → Sell / deliver
 ↑                                    │
 └──── Collect now or on a later date ──┘
```

Track materials and finished goods separately so unused materials are not confused
with spoiled food. Buying stock uses cash and creates an asset; consumed or spoiled
stock becomes a cost. A fulfilled sale creates revenue whether paid now or later.
Borrowing adds equal cash and debt. Interest is a cost; principal repayment reduces
cash and debt. Owner withdrawals reduce business cash, not trading profit. Cash held
in reserve does not itself create profit. Supplier credit creates a payable with a
due date. Equipment remains an asset with a stated depreciation rule; buying it is
not the same as spending on ingredients or recording an immediate operating loss.

For a fictional example, start with 190 cash. Deliver an order sold on credit for
240; pay 160 for the materials consumed and 20 for all other costs in this example.
Profit is 60, cash is 10, and the customer owes 240. A new batch needing 80 cannot
be funded from that cash. Collecting the 240 later changes cash and customer debt,
not profit from the earlier delivery. Borrowing 100 would instead raise cash by 100
and create a debt of 100, before any subsequent fees or interest.

An investment must change a specified cost or constraint. More cooking capacity does
not increase deliveries when packing or demand limits them. An investment can also
reduce waste or owner time without raising sales; evaluate its actual benefit and cost.
Working capital must be considered alongside equipment, not as a late exception.

---

## 4. Depth without extra effort

Depth comes from four sources. None of them adds a screen.

1. **Standing plans.** The player changes the plan only when something changes.
   Routine weeks cost one tap. The number of meaningful decisions stays high because
   the player's attention goes to exceptions.
2. **Named relationships with history.** Each customer and supplier remembers how
   the player dealt with them. A customer who was paid on time, or supplied on time,
   can refer a new customer. A supplier who was paid late withdraws credit. These are
   specific facts in the notebook, not a reputation score.
3. **Uncertainty reduced by action.** Opportunities come with stated interest.
   Demand and payment events vary within authored bounds. A paid trial shows what
   those buyers paid for those terms on that occasion. Reorders, larger volumes and
   later payment remain uncertain. Use a recorded random seed for reproducibility;
   do not claim that the trial reveals a permanent hidden conversion rate.
4. **Growing requirements.** Larger opportunities need several earlier capabilities
   at once: cooking capacity, working cash, a helper who can be left alone, and
   records. The player cannot buy them all in one week.

**Context matters.** Trials, records and checks use time or money. Holding cash can
delay an investment, but a reserve is useful when cash limits production or protects
obligations. Do not invent penalties to ensure a sound habit loses sometimes. Check
that the model represents the relevant trade-offs and does not reward a fixed sequence
of purchases regardless of the business state.

**Recovery.** Running out of cash need not end the game. The player can reduce batches,
sell equipment at a stated loss, seek finite credit, negotiate terms or pause a channel.
Counterparties can refuse. Delayed obligations remain due. If recovery is not viable,
the business can close; retain its full account and offer a separate new run.

---

## 5. Opening sequence: month 1 (weeks 1–4)

These weeks are the candidate prototype schedule. Measure actual play time; no
minutes-per-session claim is established. This is one illustrative path. If the
player declines credit or an opportunity, later scenes must respect that choice.

**Before week 1.** Choose the language and see a short explanation of the local
record. See the stall: sample cash 15,000, one pot, you alone, household money 1,500,
and a payment of 9,000 in week 8 on the calendar strip. The ordinary price and batch
are ready. No exact-price entry, prediction or business-plan form blocks opening.

**Week 1 — sold out.** The default plan is 4 trays a day at the normal price. The
player taps "Open the stall". On four of six days the trays are empty by 9:00, and
small figures walk away. Opening help links the empty display to the current batch
limit, with a label as well as a highlight. Cash, sales and profit are shown. The
player can see the movements behind the result without a compulsory explanation.

**Week 2 — the next limit.** The player can raise the trays. Above 5 trays the
single pot is the limit. The board shows what fits within available hours; it cannot
create output from hours nobody has. The shop offers a second pot (sample 6,000)
and the Sell tile offers a higher price step. During the week an
interruption: "Mama Neema asks to take six mandazi and pay on Friday." Yes or no.
If yes, the same request can come again.

**Week 3 — following the money.** If a credit balance is still unpaid, the week card
shows sales that have not all become cash. Mama Neema's known balance remains available
for follow-up. If she paid, show that collection. If credit was declined, show the actual
stock purchase or household withdrawal instead. Do not invent an unpaid sale. There is
no forced "why?" quiz or invented expectation.

Offer the notebook as a way to retain each customer's terms, receipts and delivery
details. A short matching action attaches an available receipt to its transaction.
The first result and future due-date list show its use. By this point automatic
constraint highlights stop; symptoms remain visible and explicit help is available.

**Week 4 — somebody says they like the idea.** Workers at the office across the
road say: "We would all buy chai and mandazi at 10:00 every day." Three actions:

- Buy a flask and cups and start next week (sample 5,000).
- Run a one-week paid trial with a borrowed flask: show its cost and preparation,
  serving and delivery hours. You see how many pay during that trial, at its stated price.
- Not now. The offer stays open for two weeks.

**Month 1 close.** The review, the first links between decisions and results, and the goal
choice. The player leaves with open questions: Will the office buy? Will Mama Neema
pay? Is there enough for week 8?

**What the opening has done.** The player has met capacity limits, a price choice,
credit to a customer, the difference between the tin and the sales, the cost and
value of records, and stated interest versus payment. There was no lecture and no
answer marked right or wrong.

---

## 6. Later sequence: commitments and consequences

The following dates demonstrate a possible 24-week prototype. Events depend on the
actual business state. A refused order cannot create a later delivery failure, and a
person never hired cannot lose stock. Direct-sales play must also contain experiments,
record use, cover or planned closure, and a setback with time for recovery.

### 6.1 Weeks 8–12: the dated payment and the school

**Earlier choices:** second pot (week 2), notebook (week 3), paid office trial
(week 4). Six of the 20 people who expressed interest paid during the trial.
Later orders establish whether any become regular buyers. The player
bought two bags of flour in bulk in week 6 and gives credit to three neighbours.

**Week 8 — the payment is due.** The tin has 6,100. The payment is 9,000.
The player can follow up 3,400 owed by named neighbours. The notebook, if maintained,
shows exact delivery and payment history. If one customer disputes an earlier delivery,
that record helps investigate it. Without it, the player can still ask for payment
or reconstruct the history from available evidence. Either way, collection is not
guaranteed. Other actions include selling usable stock, negotiating payment dates or
seeking a loan with its amount, fees, interest and repayment schedule shown. Any lender
requirements are fictional prototype terms until locally reviewed. No notebook option
automatically qualifies the player for cheaper finance.

**Week 10 — the school.** The office manager tells the school cook about you. The
school asks for 600 pieces a day, paid 30 days after delivery. The game shows a
"What this needs" card calculated from the player's own state:

- cooking capacity: calculate actual pots, staff and owner hours, then compare with
  the order's required output; do not assume a fixed starting capacity;
- working cash: inputs, wages and delivery costs until payment, less confirmed cash
  receipts; calculate from current stock and terms, including the risk of delay;
- a food-hygiene inspection: requirement and cost **not yet verified** for Tanzania.
  The game marks this as a sample until local review. <!-- UNVERIFIED -->

Actions can include proposing a smaller order, a deposit or a paid trial, or declining.
The buyer may refuse proposed terms. Supplier credit can fund inputs if available;
it cannot fix a production shortage. An accepted commitment must have a feasible
delivery plan, or explicitly expose the capacity still to be secured and the risk.
Run through production, delivery, the due date and collection or a missed payment.
Declining is a normal choice, not a failure.

### 6.2 Weeks 13–17: a helper and the away week

**Week 13 — a helper.** Juma offers to cook at dawn. A work sample or trial provides
evidence of what he can do; his name or biography does not establish competence.
The player can hire, defer or use a trial, then assign responsibility, show the
required result and choose a check. Training, checking and wages have stated costs.
Checking every item forever can keep the owner as the constraint; a suitable batch
check may release time. A worker's observed skill and preparation affect output.

**Week 15 — a discrepancy.** On a path with a helper, a batch has fewer accepted
pieces than expected. With dispatch and acceptance records, the player can locate
the difference and investigate damage, counting or specification errors. Without
that detail, investigation takes more work and may remain inconclusive. Do not label
the worker dishonest or invent a theft simply because checks were omitted.

**Week 17 — time away.** A planned five-day absence is shown two weeks ahead, without
an invented personal crisis. The player can prepare cover, reschedule commitments
or plan closure. The result depends on what exists by then:

| State at week 17 | Result |
|---|---|
| Capable helper, clear responsibility, preparation and proportionate checks | Work continues within demonstrated capacity. Any existing orders can be delivered if the plan funds and covers them. |
| Helper with unclear responsibility or insufficient preparation | Dispatch may be delayed or quality inconsistent. Available records affect diagnosis, not the existence of the underlying problem. |
| Planned closure, customers informed | No trading income during closure. Any rescheduling terms apply; a reserve can fund obligations. |
| Uncovered commitments | Only actual undelivered orders cause missed deliveries and the relevant customer's response. |

### 6.3 Weeks 18–20: an assumption breaks

**Week 18 — flour price rises by a sample 25%.** Everyone sees the new input price
before purchasing. When the dearer materials are used, the result shows their effect
on margin; existing cheaper stock must retain its stated cost treatment.
Actions: raise the price, make smaller pieces (quality risk), change supplier, or
ask an existing buyer to renegotiate. Holding the plan is also available. Record the
new information, subsequent commitments and results. Neither change nor a shorter
delay to change earns credit. Continue trading so the response has consequences.

**Week 20 — the second dated payment.** Its difficulty depends on everything above:
school debts, loan repayments, the helper's wage, stock held and the buffer.

### 6.4 Weeks 21–24: follow-through and review

Use these periods to see the result of revised prices, payment terms, staffing and
production. Let invoices mature, debt payments fall due and customers reorder or leave.
Do not introduce a major investment just before the ending. The packaged-buns and
oven expansion is outside this first prototype; the existing order already tests
capacity, working cash and buyer requirements.

Offer a season review after the major trial, payment and adaptation cycles have been
observed. In the prototype, check whether week 24 provides enough follow-through. If
not, move the commitment earlier, extend the schedule or reduce its scope. Do not
claim a completed causal sequence while the material consequence is still pending.
The player can end at the review or continue trading. A partial run remains available
at any time. No separate "full game" is required after this experience.

---

## 7. Two trajectories without labels

The player does not choose "livelihood" or "transformational". They choose goals and
actions. The season account shows what the business became, in facts. These are
illustrative results at week 24 of the candidate prototype:

| Fact at week 24 | Steady stall example | Organisation example |
|---|---|---|
| Household money paid | 24 of 24 weeks | 22 of 24 weeks |
| Saved buffer | 5 weeks of household money | 1 week |
| Your hours per week | 42 | 55 |
| Business customers | 0 | 3 (office, school, kiosk) |
| Weeks traded without you | 0 | 1 |
| Money owed to you / by you | 0 / 0 | 14,000 / 9,000 |
| People paid by the business | 0 | 1 |

Both are legitimate outcomes. Neither table column assigns a founder type. A small
business can delegate well; a larger one can remain dependent on its owner. The review
shows current obligations and constraints, rather than prescribing a second hire or
more equipment from the route chosen. Growth adds commitments and can end worse than
a steady stall. Revenue and staff count do not by themselves show an organisation.

The livelihood route has substantive decisions about reliable customers, margins,
waste, reserves, supplier terms and cover during absence. It is not the same game
with all later events removed. Declining a large order can protect that operation.

Where buyer qualification or formality matters, show preparation time, initial costs
and recurring obligations alongside uncertain commercial returns. There is no one-tap
compliance badge. Early prototypes use clearly marked fictional requirements. Verify
specific local rules and fees before presenting them as facts. Ordinary operations
also have obligations; choosing a livelihood goal does not grant an exemption.

---

## 8. What the game teaches, records and cannot show

### 8.1 Teaching through mechanics

| Lesson | How the player meets it |
|---|---|
| Payment is stronger evidence than stated interest | A paid trial produces an observed purchase; later repeat demand remains uncertain |
| Sales, profit and cash differ | Always-visible sales, profit and cash; delivered orders can remain unpaid |
| Stock, credit sales and payment delays use cash | Inventory and customer balances; the school's 30-day terms before a dated payment |
| Borrowing creates an obligation; kept cash is not profit | Loan adds cash and debt together; repayments on the calendar strip; idle cash earns nothing |
| A useful investment removes a specific constraint | Visible queues, unused capacity, cash shortages and demand; optional diagnostic help |
| More production, staff or funding can make things worse | Waste when demand is the limit; wages when the stage is not cooking; debt when collection is the problem |
| Delegation needs capable people, clear roles and checks | Trial week, role card, daily count, and the away week |
| Records explain and support decisions | Customer history, payment matching and evidence for investigating discrepancies |
| Adapt when an assumption breaks | Flour price, late payer, competitor, rain weeks |

### 8.2 The evidence ladder

The record and every screen keep four kinds of information apart. They never share
a total. A plan is distinct from a report of real activity.

| Level | Label in the app | Example | Who can confirm it |
|---|---|---|---|
| Played | "In the game" | Ran a paid trial before buying equipment | A local game log, not proof of identity or unaided play |
| Planned | "You plan to do this." | "I will ask 5 people to pay for a sample." | Nobody; it has not happened |
| Reported | "You wrote this. Nobody has checked it." | "I asked 5 people; 2 paid." | Nobody yet |
| Checked | "Checked by [reviewer], for [scope], on [date]" | A reviewer checked specified payment evidence | An operating programme; this game cannot award the status |

State the verification method and remaining limitations. An uploaded receipt or image
does not automatically become checked evidence. A checked sale does not establish
profitability, repeat demand or future firm performance.

### 8.3 What is recorded

Keep a chronological log of material actions and simulated advances, including the
seed and initial state, pinned content and calculation versions, information available
at commitment, relevant help, decisions and resolved transactions or events. Store
the exact event order within a week, including interrupted trading. Retain the content
snapshot and a way to identify the calculation rules needed for historical replay.

The same inputs and calculation rules should reproduce the outcome. Reproduction
checks internal consistency; it does not authenticate the player or the local log.
A seed alone does not prevent duplicate transactions. Implementation must save each
committed action and its result atomically with stable event identifiers and a saved
interaction phase. Reload resumes a committed result instead of applying it again.
Do not recalculate old attempts with new rules and silently overwrite their outcomes.

Retain separate attempts, replays and partial runs. Record only fields needed by the
specified observations. No clickstream, reading-speed measure, device fingerprint or
idle-time judgement. Outside assistance remains unknown; observed in-app help is
context, not a penalty. The learner can inspect, export or delete their local record.

### 8.4 Observations and their limits

| Observation | What it shows | What it cannot show |
|---|---|---|
| Tested before committing money to an opportunity | In this model, with costs shown, the player chose to test | That the person would find, ask and sell to real buyers |
| Investment and current constraint | The visible state, selected investment, help shown and later result | Independent diagnosis when help named the constraint; general diagnostic ability |
| Dated obligations met | Cash was managed toward known dates | Real household or business cash management |
| Response after new information | The information shown, subsequent commitment or unchanged plan, and result | Attention, adaptability or superiority of a faster change |
| Notebook maintained; receipt matched or discrepancy investigated | The specific simulated record task and assistance | Independent bookkeeping from selecting an option, or record keeping in a real firm |
| Delegation set up before the away week | The player assigned a role and checks | Ability to recruit, train or trust a real person |
| Goals chosen and changed | Stated preference at that time | Real ambition, capability or founder type |

Rules: no composite score, no rank, no speed measure, no automatic exclusion.
A first run and a later run are different evidence, because the player has learned
the model. Reading help, pauses and slow play are not evidence of lower ability.
No observation is a validated predictor of real firm performance.

Summaries link back to events: "After the buyer missed payment, you reduced the next
credit order and kept cash for stock." Do not infer a trait such as grit, honesty or
leadership. A poor outcome can follow a reasonable decision under uncertainty; a good
outcome can follow a reckless one. Retain both context and result.

### 8.5 The connection to real tasks

At a review point offer an optional **real experiment note** linked to play: choose
one uncertainty, a small action, its cost and what result would inform the next step.
For example, try selling a small sample before committing to a larger batch. A fixed
number of people approached is not a proof threshold. A learner without a current
business can skip it. Permit short phrases; a future programme can support facilitated
oral answers without rewarding writing polish.

Store an intended action as "Planned" and a later account as "Reported". Explain that
both stay on the phone unless explicitly shared. A future programme must check stated
evidence before claiming real execution. Use game observations to inform practical
follow-up and training, not automatic funding rankings or rejection.

The app does not promise grants or show any programme connection that does not
exist. The existing local portal accepts four chapter records. A continuous-business
record needs a reviewed intake contract; the current chapter requirement does not
govern this design. Earlier game access remains for existing learners during transition.
The new player does not have to find a separate "full game". Do not claim the new run
satisfies a programme requirement until the actual intake service supports it.

Playing without sharing is complete use of the game. Before a send, show the selected
record, recipient, intended use and withdrawal/deletion limits, and obtain explicit
consent. Reconnecting does not transmit data. Financial details from real businesses
require separate consent. Successful submission requires an actual service receipt.

---

## 9. How to test understanding and the wish to continue

### 9.1 Before implementation: complete causal paper test

Use stock, cash and order cards to play the opening and a later sequence with overlapping
credit, wages and delivery commitments. A facilitator applies the proposed model.
Check whether people understand the choices and want to see the next consequence.
This tests the business sequence, not phone usability. Revise it before authoring
a large amount of content.

When implementing the model, check representative policies such as always expanding,
testing each opportunity, holding a reserve and using credit. Use seeded runs to
exercise materially different paths, with checks that:

- credit sales create receivables and later collection does not create new profit;
- inventory, debt, assets and cash reconcile, with no unfunded automatic purchase;
- reasonable policies can support each goal under stated conditions;
- declined opportunities do not trigger obligations and recovery has real limits;
- outcomes depend on costs and constraints, not hidden rewards for lesson keywords.

Do not tune the model to punish each "bad" policy or force a sound habit to lose.
These checks establish model behaviour, not learning or real-world predictive validity.

### 9.2 Paper or clickable pipeline test (5 people)

Show a finished week on the board, without a diagnostic highlight, and ask:
"What stopped you delivering more?" Include a different case where delivered sales
are profitable but cash is tied up with customers.
Target: 4 of 5 point to the right stage without help. If not, redesign the picture
before building anything else.

### 9.3 Opening and later slice (two rounds of 6, per MV-BS-TEST-001)

Test both languages with appropriate speakers, including slower readers, experienced
operators, people without a business and people less familiar with apps. Use real
low-end phones, including a 2 GB Android. Observe normal play before teaching questions.
Use the opening and a later playable sequence; do not certify the whole design from
month 1 alone. If the later slice uses a prepared state, explain its history and keep
those observations separate from a continuous run. Observer tasks:

1. Show where cash went using available transactions, without a notebook prerequisite.
2. Explain a new constraint such as packing, with no automatic answer highlight.
3. Explain what an office trial established and what remains unknown.
4. Work through a new profitable sale that is not yet paid.
5. Respond to a changed assumption, including a reasonable decision to keep the plan.
6. Match a payment or delivery record and explain what cannot be resolved from it.

Permit speech and pointing. Record help needed; do not have the observer operate
the phone. Native speakers and local operators must review wording and commercial
assumptions. A small test sample cannot establish population effects or predictive validity.

**Wish to continue.** At month 1 close, offer a clear way to stop. Record, with
consent, whether the person continues without prompting and what they ask about
("Will this buyer reorder?"). Ask what they want to try next; a specific answer is a
better sign than "it was nice". Observe the same choice after the later slice. Repeated
automatic advances can mean boredom, confusion or a reasonable standing plan; ask and
inspect context rather than treating no change as disengagement.

**Proposed usability targets:** 5 of 6 can operate a trading cycle and explain the new
profit/cash example without the observer taking over; 4 of 6 choose another cycle at
a clean stopping point. Report counts, language and assistance context. These targets
are provisional design checks, not learning-impact estimates or learner pass marks.
If two people stop at the same interaction, revise it before adding more content.
Fix failures after the first round and test with new people in the second.

### 9.4 Full run

Observe the complete sequence and measure actual time and later resumption with consent.
Compensation must not depend on completion or return. Ask about access and time barriers;
no silent tracking of non-sharers. If players repeat a lesson but continue only when
prompted, engagement remains unproven. If they continue but cannot explain consequences,
revise feedback and test transfer with a fresh example.

Test offline play, save interruptions, large text, screen readers, reduced motion and
old-record access. Lost records, inaccessible essential actions or false accounting
block release. Software checks cannot establish learner or commercial acceptance.

Learning and predictive validity are separate questions. Later validation needs defined
real-execution outcomes, consented follow-up, assessors initially blind to game records
and participants with varied play outcomes. Studying only selected winners cannot
validate a selection rule. This design claims neither learning impact nor predictive validity.

---

## 10. Delivery and transition

- **Technology.** Retain vanilla JavaScript and small SVG scenes (ADR-0006), system
  fonts and native controls. Reuse existing formatting, localisation and durable-save
  patterns where they fit. Trace the current engine before choosing which calculations
  to retain or replace. This proposal does not require runtime AI or a new dependency.
  Measure compressed assets against the repository's delivery budget.
- **Offline.** Cache the complete core season after the first completed load and show
  offline readiness. No later mandatory download to finish the game. Keep a standalone
  offline file. Any audio is a separate optional download with its size shown and a
  text alternative; it is not part of the initial asset budget.
- **Language.** All text in English and Kiswahili from the first build. Short
  sentences. Icons with every tile. Amounts are neutral and formatted at render.
- **Accessibility.** Use large labelled controls, screen-reader names, adequate
  contrast and text beside icons. No drag-only or colour-only information. Support
  text enlargement, keyboard use and reduced motion. No timed interaction.
- **Data.** Everything stays on the phone. Download and share are explicit actions.
- **Existing records.** Give new runs a versioned record separate from legacy saves.
  Preserve existing profiles, attempts, introduction records and prototype saves with
  their original meanings. Earlier records remain readable and downloadable; unfinished
  older games retain a continuation route. Do not reinterpret chapter completion as
  new-game mastery. Test backups, failed writes, concurrent tabs, interrupted saves and
  mixed-version updates before replacing the entry page. Preserve unreadable sources
  for recovery. Legacy compatibility is not a second mandatory game for new players.

## 11. Review and next deliverable

This is the single current candidate for review. Its concrete proposal is one continuing
business, standing plans, a visual goods-and-cash cycle, dated obligations, useful records
and periodic reviews. The owner accepted implementation. The 24-week schedule and numerical goals remain
test settings. Local code exists; field acceptance and deployment are separate.

The owner has accepted ADR-0014 and requested a playable implementation. Build the
minimum complete model and record contract, including early and later play. The causal
paper test and observed phone trials remain external acceptance work. Review local
figures and Kiswahili before learner trials. The final duration
depends on those trials. Programme intake, validation and participant deployment remain
separate work; this draft changes none of them.

## 12. Local implementation boundary

The new source entry implements the continuous season. The five business panels open
on demand. A standing plan can run one week, or routine weeks until an event or review.
The scene shows saved results; animation never determines revenue or records timing.
Cash, sales and profit remain visible without buying information. Borrowed principal,
interest, stock, assets and delayed customer payments have separate ledger effects.

The season retains several local attempts. A record pins rules and bilingual content,
ordered actions, results, language, assistance and chosen goals. See
[ADR-0015](./adr/0015-season-records-and-preserved-games.md). Earlier games keep their
own pages and stores. The new record has no portal submission or eligibility claim.

The implementation is a bounded model. It buys a week's inputs before trading. Customer
payments vary within authored bounds. School and kiosk orders receive stock before
walk-in customers. One helper cooks; training and checks change capacity or losses.
The notebook preserves invoice and delivery detail. Looking at its comparison is an
observed use of supplied records, not independent bookkeeping. The away goal records
sales with a helper, notebook and checking plan; it does not certify reconciliation or
leadership. Unmet household needs remain visible; they are not booked as business debt.

Commercial amounts, customer terms and staff arrangements are fictional test settings.
No local employment or food-safety rule is verified by this model. The game does not
capture or verify a real paid experiment. Those links remain programme work.
