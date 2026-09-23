# MV-BS-DES-001 — One business, continuing consequences

**Business Simulator · Masika Ventures**

**Status:** Historical proposal, retired as the current draft. Not implemented or accepted.

Use [MV-BS-DES-002 — consolidated game design](./MV-BS-DES-002-continuous-business-pipeline.md)
for review. It combines the parallel proposals and review corrections. The original
proposal below remains for traceability; it is not a second implementation specification.

**Date:** 2026-09-23

**Decision record:** [ADR-0014](./adr/0014-continuous-business.md)

## Recommendation

Build one continuing business: a small snack kitchen that sells fresh packs directly
and can supply repeat orders. The player owns it. The same cash, stock, equipment,
customers, obligations and staff continue throughout play.

The central question is: **Can you make this business support you, meet its promises,
and work in the way you want?**

The kitchen is a proposed setting, not a claim about local trading conditions. It makes
production, waste, cash sales, credit orders and delegation visible in one place. Its
local product, amounts, costs and language need practitioner review. This proposal uses
fictional quantities and money units to explain mechanics, not Tanzanian market prices.

This replaces the introduction-plus-chapters structure. It follows the distinction
between simulated behaviour and real execution in the [project thesis](./context/transformational-entrepreneurship.md)
and [assessment rules](./assessment.md). The specific mechanics below are design
hypotheses. Their learning value and appeal have not been tested.

## 1. Role, attachment and objective

Start with a working kitchen, modest equipment, limited cash and a few customers.
There is something to protect from the first sale. Avoid a setup form, a business plan
or a choice of founder type. Naming the business can be optional after play starts.

The first objective is concrete: fund the next batch and take some earnings home by the
next household payment date. Later, the player can change their income target, reserve
and desired working hours. These are visible goals, not measures of ambition or worth.
Taking money home is a legitimate use of the business. Missing a target does not assign
a personal failure label or trigger a distress story.

A few recurring people give the business continuity: a direct customer, a buyer, a
supplier and a potential worker. Their behaviour concerns specific dealings. A buyer
reorders after an acceptable delivery. A supplier refuses more credit while an invoice
is overdue. There is no general reputation score.

Attachment should come from seeing one's own operation change: a crowded packing bench,
an unused machine, a worker completing a task without help, a payment finally received.
The reason to continue is an unresolved business question: will this buyer reorder,
will the new arrangement work, can I afford the next batch?

## 2. The business board and play loop

Use one main board. It shows the work area, stock, orders and cash. A compact strip
shows cash available, the next payment due and owner time committed. Sales and profit
appear separately in the trading result. Customer debts remain visible beside orders.

The recurring loop is:

1. **See what changed.** An order, a delivery, a bill or a problem appears in its place.
2. **Adjust the business.** Tap an order to change quantity or terms; tap stock to buy;
   tap a worker to assign responsibility. Existing arrangements persist.
3. **Run the trading period.** The button names the date or interval it advances.
4. **See what happened.** Goods, payments and unpaid invoices move to their destinations.
   A short factual result stays on the board. The next decision is available there.

The player does not repeat every setting each day. Normal trading can run unchanged.
Advance through uneventful days to the next material event, showing the interval first
and stopping before a decision, shortage or commitment needs attention. Nothing advances
while the app is closed. There is no tapping race or compulsory forecast.

Controls change real quantities or arrangements. For example, allocate a batch between
counter sales and an order, select a deposit term, or assign packing to a worker. Use
large tap controls and labelled quantities. Dragging can be optional, never required.
Known costs and commitments are visible before the player commits. Future demand and
payment reliability are uncertain; the interface must not present them as exact forecasts.

A simple flow picture explains the business:

```text
Cash → materials → production → packing → customer
 ↑                                         │
 └──── payment now or on a later date ───────┘
```

The screen shows where goods or money are waiting. If packing limits deliveries, extra
production creates a pile at the packing bench. If payments are late, delivered orders
move into money owed by customers, not into cash.

Animation shows a calculated result; it does not determine it. It is brief, skippable
and replaceable with labelled static changes. No moral or required explanation follows
each action. An optional “Why?” view shows the movements behind the result.

## 3. Depth, progression and scope

Depth comes from obligations that overlap. More sales can consume cash. Credit can
protect today's cash and create next week's payment. A helper can free owner time but
needs wages, instruction and checks. A machine can increase output that nobody buys.

Introduce each control when its object first matters. Show only the immediate decision,
but keep all active obligations accessible. Do not hide a bill to manufacture a surprise.
Use a small number of recurring customers and staff so the player can recognise cause
and effect without managing a large dashboard.

The same mechanism should change value with circumstances. A machine is useful when
production limits confirmed, fundable orders. It is wasteful when demand, packing or
working cash is the constraint. Borrowing can finance a sound order; it cannot turn a
loss-making order into a profitable one. A paid trial reduces uncertainty, but cannot
guarantee repeat demand or timely payment on a larger order.

Use bounded changes in demand, supply and payment timing. Reveal their actual cause
when it becomes knowable. Do not secretly punish the action a lesson author dislikes.
The record must distinguish the information available at commitment from later news.

Recommend a **complete operating season**, defined by consequences rather than a fixed
number of decisions. It must allow:

- A customer test, its delivery and a later reorder or refusal.
- Several stock-to-sale-to-payment cycles, including a collection delay.
- An investment whose benefit or cost is experienced across later trading periods.
- A delegated task, a check and a later opportunity to improve the handover.
- A broken assumption, a response and enough trading to see that response work or fail.
- A period maintaining the player's chosen income and time goals after the change.

These overlap in the same business. They are not six modules. A failed experiment is
valid content. Declining a large order leads to deeper direct-sales decisions, not to
an empty route or a compulsory return to the rejected opportunity.

The first full version should contain one product family, direct sales and repeat
business orders, a small team, limited equipment choices and a few related disruptions.
Do not include exports, multiple towns or a general economy simulator in this scope.
The duration follows from observing the full causal cycles. Do not market it as a
five-day introduction or fill it to an arbitrary turn count.

At a natural review point, report the business the player has built: money taken home,
cash and obligations, owner hours, repeat orders and work completed without the owner.
Offer an ending there or continued trading. No stars, rankings or growth trophy.

Cash failure has consequences. The player can reduce a batch, negotiate terms if the
counterparty agrees, sell an asset at a stated loss or close. Credit is finite, and new
finance cannot silently erase liabilities. If recovery is impossible, retain the run
and offer a separate new attempt. Failure need not mean replaying a tutorial.

## 4. Concrete opening

The following is an illustrative path, not a script that every player must follow.

**The first batch.** Open on an empty display, ingredients and a short instruction:
“Make today's batch. Keep enough cash to open again.” The player chooses a batch size
with a tap. The ordinary price is already set; changing it becomes available when
there is a reason to experiment. No exact-price entry or profit estimate blocks play.

For a transparent fictional example, start with 100 money units. Ten packs cost 40 to
make. Other costs for this period are 10. Eight sell at 7 each; two spoil. Show:

| Movement | Amount |
|---|---:|
| Sales, all paid | 56 |
| Production cost, including the two spoiled packs | 40 |
| Other costs | 10 |
| Profit | 6 |
| Closing cash: 100 − 40 − 10 + 56 | 106 |

The shelf and waste tray explain the result before the player opens arithmetic.
One small observation does not prove that tomorrow's demand will also be eight.

**An enquiry.** A buyer likes the product and mentions a much larger possible order.
There is no sale yet. On the order card, the player can offer a small paid delivery,
send free samples, seek firmer terms or continue serving existing customers. These have
different costs and information value. Free samples may open a conversation; compliments
do not enter the sales total.

**A commitment.** If a trial is agreed, its quantity, price, deadline and payment terms
appear on the board. The player allocates the next batch. Serving the buyer may leave
fewer packs for direct customers. Delivery and payment appear as distinct events.

**The first continuing consequence.** The buyer may reorder, request a change or stop.
Direct customers may also return. The player now has evidence to change batch size,
customer mix or terms. A new batch uses the actual remaining cash and stock. There is
no reset to a convenient opening budget.

## 5. A later sequence from those choices

Suppose the trial led to recurring orders. The player accepted delayed payment, hired
a packer and bought more production capacity. Now a large order has been delivered.

In another fictional, isolated accounting example, cash before fulfilment is 190.
Forty packs sell on credit for 240. Their materials cost 160 and all other costs for
this example are 20. Profit is 60. Available cash is 10. The customer owes 240.

The next batch needs 80 in cash. The buyer misses the payment date. The production
machine stands idle. The player can see why more capacity will not solve today's problem.

The earlier choices alter the available response:

- A deposit would have reduced the cash gap. The buyer might have accepted a smaller
  order in exchange for those terms.
- A cash reserve might fund the next batch. Keeping that reserve would not itself
  have created profit.
- A recorded delivery and due date help resolve the buyer's payment query. A record
  does not guarantee payment or make a customer trustworthy.
- Supplier credit can fund materials if available, at a stated price and due date.
- A loan of 100 adds 100 to cash and 100 to debt, with no immediate profit. Interest
  later reduces profit; principal repayment reduces cash and debt. Terms are visible.
- Smaller paid orders, a negotiated deposit or a temporary reduction in production
  may provide a workable route without new borrowing.

After the player responds, continue through the next collection and repayment dates.
The game must let them experience whether their response solved or moved the problem.

Now the owner needs time away from the kitchen. The packer has already worked several
batches. A small work sample and past work show what this person can do; a biography
does not certify competence. The player can assign packing responsibility, specify an
acceptable pack and set a dispatch check. Teaching takes owner time. Checking every
pack forever also takes time; a proportionate batch check can release some of it.

On the later unattended shift, unclear responsibility may delay dispatch. A capable,
prepared worker may keep the order moving. Payment chasing, wage costs and promised
deliveries still continue. Hiring alone does not make the owner removable.

Records are useful work inside these events: attach a delivery slip to an order, compare
received cash with the amount due, or compare packed units with accepted units. Do not
require manual entry of every sale. The simulator retains its audit trail regardless;
the player's record practice concerns using and maintaining business information. Opening
an automatically produced chart is not evidence of keeping books independently.

## 6. Livelihood and organisation-building

The player can pursue reliable take-home income, shorter working hours or a business
that handles larger commitments without constant owner involvement. These goals can
coexist and change. There is no founder-type classification.

The livelihood route has full depth: repeat cash customers, waste control, pricing,
supplier terms, reserves, affordable cover and recovery from a weak trading period.
Refusing a large order can be a successful decision when it threatens this operation.

Organisation-building requires more than revenue. The same business must fund stock
and payment delays, recruit capable staff, transfer responsibility, check quality and
keep usable records. The visible achievement is an operation that meets commitments
without the owner handling every task. A small firm may also achieve this.

Larger buyers can introduce requirements, preparation costs and waiting periods.
Formalisation and compliance must not be a badge bought in one tap. Show the initial
cost, recurring obligations, time and uncertain commercial return. Use clearly marked
fictional buyer requirements for early prototypes. Specific local regulatory requirements
and fees need sourced practitioner review before publication as local facts. Ordinary
operations are also subject to applicable obligations; choosing a livelihood goal does
not exempt the business.

## 7. Teaching and the observation record

Keep observations with their context, not a capability score.

| Experience | What the game can record | What it cannot establish |
|---|---|---|
| Enquiry, paid trial, reorder | Terms chosen and commitment made after the information shown | Ability to secure a real paying customer |
| Stock and credit consume cash | Purchases, allocations, collections and liabilities in the model | Independent financial understanding from one choice |
| Borrowing and withdrawal | Cash, debt, interest and owner drawings kept separate | Prudence or ability to manage real debt |
| Investment at a constraint | Visible constraint, selected action and later simulated result | General diagnostic ability or a causal claim about real firms |
| Delegation and checks | Work assigned, instructions, check and simulated delivery | Leadership, real recruitment or staff competence |
| Business records | Specific reconciliation or use of a record, with help available | Accurate bookkeeping in the learner's own firm |
| An assumption fails | New information, subsequent action and subsequent result | A stable trait such as resilience, grit or adaptability |

For each material commitment retain the scenario and calculation versions, relevant
business state, information available, action, observed in-app help and resulting
transactions or events. Preserve partial runs and distinguish replays. Record only
what supports the specified observations; no clickstream, reading-speed score or idle-time
judgement. Help use is context, not a penalty. Unobserved outside assistance remains unknown.

A useful summary says: “After the buyer missed payment, you reduced the next credit
order and kept cash for stock.” It links to the events. It must not say: “You are a
high-potential entrepreneur.” A poor result can follow a reasonable decision under
uncertainty; a good result can follow a reckless one. Keep both decision context and outcome.

The learner sees what is recorded before play and can inspect, export or delete it.
It stays local until explicit sharing with a named recipient. A local record cannot
prove identity, unaided play or that it was not edited.

## 8. Connection to real experiments

At a review point, offer an optional bridge: choose one uncertainty to test in a real
business, define the smallest useful action and retain a short local note. Permit short
phrases and facilitated oral responses in a future programme. No polished essay is needed.

Keep four statuses distinct:

1. **Simulated:** the player delivered to a buyer in the game.
2. **Planned:** the learner intends to seek a paid trial.
3. **Reported:** the learner says a real trial occurred and may attach supporting material.
4. **Verified to a stated extent:** a reviewer checked specified payment or delivery
   evidence, recording what was checked, when, by whom and with what limitations.

An uploaded photograph or receipt does not automatically move an event to verified.
A checked sale does not establish repeat demand, profitability or future growth.
Programme support should respond to actual experiments and verified constraints.
Game observations can guide a practical follow-up or training discussion.

This proposal does not set funding rules. A future programme may define participation
requirements, but four old chapter completions must not dictate the new experience.
No grant promise, live application button or successful-send message appears without an
operating recipient and real integration. No automatic rejection or funding ranking
should be based on unvalidated simulation observations.

## 9. Test understanding and desire to continue

First test a tabletop version of the complete causal sequence. Let people move stock,
cash and order cards while a facilitator applies the model. This tests whether the
business choices are understandable before interface work. It cannot establish phone usability.

Then use two rounds of six new learners, adapting the existing
[acceptance protocol](./MV-BS-TEST-001-learner-acceptance.md). Include current operators,
people without a business, slower readers and people less familiar with phone apps.
Test English and Kiswahili with appropriate speakers and local language review. These
small rounds discover failures; they do not establish population effects.

Observe ordinary play before asking teaching questions. At natural pauses:

- Ask the learner to show where money went after a profitable credit sale.
- Present a fresh situation where packing, rather than cash or production, limits
  delivery. Let them act without naming the constraint for them.
- Change one assumption and observe the next commitment. Accept a reasonable decision
  to hold course as well as a reasonable change.
- Revisit a related problem with different quantities or terms. Check transfer rather
  than recognition of a familiar answer. Permit speech and pointing instead of writing.
- Offer a genuine stopping point after a consequence becomes clear. Observe whether
  they start the next trading cycle without encouragement. Ask what they want to find out.
- Invite a later return under separate consent, with compensation independent of return
  or completion. Count actual resumption among those invited, and ask about time and
  access barriers. No hidden analytics are required.

Proposed usability target: five of six in each round can run a trading cycle and explain
cash versus an unpaid sale in a new example without the observer operating the controls.
If two or more stop at the same interaction, revise it before expanding content. Report
counts and language/assistance context; do not call these validated cut-offs.

For engagement, record voluntary continuation, later resumption and the business question
the player wants answered. Praise, completion and a response to “Was it useful?” are
insufficient. If players can repeat the lesson but only advance when prompted, the design
has not met its engagement aim. Trim repeated decisions; preserve consequential cycles.

Physical checks include offline completion, interrupted saves, large text, screen-reader
controls, reduced motion and an actual low-end Android phone. Any lost learner record,
inaccessible essential action or false accounting result blocks release.

Test learning separately from predictive validity. Later validation requires consented
follow-up of real execution, defined outcomes, assessors initially blind to game records
and participants with varied play outcomes. Studying only selected winners cannot
validate a selection rule. This proposal makes no claim that either purpose is proven.

## 10. Delivery and transition

Use the existing lightweight PWA approach. Budget the complete core season for offline
use after the first completed load; confirm offline readiness visibly. Use small vector
scenes, system fonts and native controls. Audio, if added, is an explicit separate
download with a text alternative. No runtime AI or new dependency is needed for this design.

English and Kiswahili cover all play, help, results, record views and failure messages.
Use concise language, labels beside icons, large targets and accessible alternatives to
motion or dragging. Translation and commercial acceptance remain separate from software checks.

Keep existing profiles, attempts, prototype saves and exports. New runs use a new
versioned record; old runs retain their original meanings and remain readable and
exportable. Do not convert an old chapter completion into new-game mastery. Preserve
in-progress legacy play through a compatibility route, without advertising it as the
new player's separate “full game.” Verify migration and recovery before replacing entry.

Implementation remains outside this deliverable. The next useful work is owner review
of this design, then a complete causal prototype and observed play, before authoring a
large amount of content or changing programme intake.
