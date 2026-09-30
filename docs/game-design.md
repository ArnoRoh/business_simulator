# Game design

**Current source:** One continuous business season, under
[ADR-0014](./adr/0014-continuous-business.md). See
[MV-BS-DES-002](./MV-BS-DES-002-continuous-business-pipeline.md) for the current design.
The 24-week setting is a prototype, not a validated duration. Plans persist. Decisions
change cash, stock, debt, customers, capacity and owner time. Native SVG/CSS motion
shows the saved week's outcomes and can be skipped.

Reopening a season restores the last decision or collection feedback without another
transaction. Feedback follows the selected language. Payment delays and broken
commitments stay visible above routine trading notes. Automatic trading stops at
these setbacks so the player can respond. A new action ends any previous animation.

A short controls dialog introduces the role, daily batch, price and trading button.
It appears once per browser, can be dismissed and reopened with **How to play**, and
has its own language control. Its dismissal is a local interface preference, separate
from all learner records. It does not recommend a business decision or count as evidence.
Existing runs receive the same introduction without a reset.

The opening shows the daily batch, its piece count and the selling price together.
The trade button explains that it buys ingredients, then cooks and sells for six days.
It waits for an edited batch to save before it trades. There is no forecast question.
Automatic multi-week trading appears after the first completed week.

Management panels are named for their contents: ingredients/supplier, equipment/people,
customers/orders, money owed and household/borrowing. The screen follows cooking
games: an illustrated street scene with the owner, helper, jikos, basket, cash tin and
queue, with cash, profit and sales counters over the sky. Five round buttons under the
scene (stock, kitchen, debts, money, buyers) open each panel as a bottom sheet. A red
number shows debts due or bills and payments waiting. A fixed bar holds the trade
action. Parts added by an action pop in, the price board flips, and cash moved outside
trading flies to or from the tin. The replay of a week shows each day: served customers,
coins, credit papers, a sold-out stamp, people leaving hungry and leftovers going to
the bin, while the cash counter runs from opening to closing cash. The result card has a
ribbon and three tiles (sold, thrown away, went away hungry) and folds away when the
learner moves on. Event cards show the character speaking. All pictures are inline SVG.
Motion is decoration only: outcomes come from the model, not from tapping speed.

After each week, a "why" section can explain what held trading back (the stage from
`limit`) and why the tin moved differently from profit (credit, home money, stock, or
equipment/loans/bills). It uses only the saved week. The first two times a topic
appears, the reasons show at once. After that, the learner chooses a reason first,
or "not sure", and then sees the reasons. A topic repeated from the week before is not
raised again. The calendar and historical
accounts sit below play. A short weekly recap shows quantities sold, waste, profit,
cash and payment/commitment problems. A receipt separates cash and credit sales,
shows sales less business costs, and reconciles opening cash with receipts and payments.
These totals come from the saved result. They do not infer motives or a correct next
choice. A next-action button moves focus to the current plan, event or review without
committing a decision. Events say that a response is needed before trading; reviews
explain how to continue. Full production/payment graphics and
receipts remain available in its details. These displays use completed results.

The business history compares weekly sales, weekly profit and cash at each week end
on the same money scale. A week selector gives exact figures, the decisions made before
trading and the full result. It does not change the current plan or replay a transaction.
The history remains available offline and without the notebook. It is learning feedback,
not a delivery record that the simulated buyer accepts as proof. Unknown future demand
and payment outcomes remain unknown.

**Earlier games, preserved:** The previous public entry is a short introduction. The full four-chapter game is
at `practice.html`. Field acceptance remains a separate check. See
[ADR-0013](./adr/0013-short-introduction-and-preserved-chapters.md).

## Short introduction

Thirteen untimed steps cover five sample days. The learner tries prices, a serving
constraint, stock, supplier credit, delegation, a paid trial, cash collection and
withdrawals. Decisions have explicit cash transactions. Customer debts and liabilities
remain visible. A cash-book example gives feedback without a pass threshold.

The learner can choose a steady-income or organisation-building direction. This is a
preference, not a measured trait. An optional next-step note stays on the device and
is not proof of execution. Finishing the introduction does not meet the programme’s
four-chapter entry requirement or establish grant eligibility. A link to the deeper
game and existing records remains available throughout.

The following sections describe the full four-chapter game.

## Learner and purpose

The game teaches practical business decisions and retains observations of play.
It supports people with and without an existing business. The design centre is an adult
who reads short text and understands everyday money, with optional learning help.
Finishing is the programme gate. A livelihood business is a legitimate outcome.

## Chapters and episodes

The stall, bakery, factory and export business are separate chapters with authored
opening states. All are available immediately. Each has twenty authored decisions,
grouped into four episodes of five. Up to two recovery turns can be inserted when cash
runs below zero. Recovery does not advance the authored-decision count.

At a mission boundary the learner sees a short recap and can continue or take a break.
At a chapter boundary an illustrated story introduces the next business and its central
challenge. Starting the next chapter is optional and uses a new authored budget. A
completed attempt is banked once. Its full record is a separate action.
Six carried flags can change a later chapter's opening within the existing carry rules.
There is no aggregate score and no requirement to play the chapters in order.

## Turn loop

1. See the business, cash, units sold, owner time and a short situation.
2. Tap an action or a labelled amount. It runs the simulated period immediately.
3. Watch the cash movement and read the result plus one short takeaway.
4. Continue to the next choice, or open the explanation and accounts.

Numeric decisions offer preset amounts with free entry available. Cash-book exercises
require an entered answer. Normal play does not ask for a forecast. Older saved forecasts
remain in their records. The new interaction is versioned so a preset choice is not
misread as independent calculation and an absent forecast is not counted as a mistake.

Business research is optional; its simulated time and money cost is shown before selection.
Help with words, controls and calculations is free. Opening a worked example or arithmetic
preview is recorded as assistance, without treating assistance as lower ability.
There is no timer. Animation never blocks the next action, and reduced motion is supported.

Each business has a distinct SVG scene. Customers, coins, stock and ships are illustrative;
labelled values give the actual calculated quantities. The detailed accounts, stock,
receivables, goal and projection remain under Open the accounts. A projection is conditional
on making no further changes. Original context and choice details remain available on demand.

## Practical exercises

The stall and bakery contain a small practice cash book. It uses explicit opening cash,
receipts and payments. The learner enters the balance; the result shows the calculation.
An incorrect entry cannot change the business cash. The record identifies it as an
exercise, not verified bookkeeping in a real firm.

Customer tasks distinguish a small paid trial from larger unpaid interest. Delegation
tasks assign buying or packing and include a check of receipts, output or rejected packs.
The factory constraint task compares current capacity and demand. Later situations revisit
cash, records, delegation and setbacks with different business conditions.

## Simulation and its limits

The pure engine computes sales, product contributions, operating costs, owner workload,
quality, reputation, debt, working capital and delayed consequences. A resolved turn
returns weekly results, closing state, fired consequences and a full cash reconciliation.
The same result supplies feedback, history and observations. It is never rerun
when a saved result is reopened.

Direct cash changes, including funded purchases and delayed costs, survive settlement.
Cash reconciles from opening cash through direct changes, profit, non-cash depreciation,
principal repayment and changes in working capital. Profit predictions cover the stated
period; cash predictions concern the closing balance.

Depreciation is a fraction of remaining equipment value each week. It is a deliberately
simple declining-balance approximation. The legacy `assetLifeWeeks` field is its divisor,
not a fixed replacement date. Inventory and payment-term exercises that only change cash
say that they do not model stockouts or additional orders.

Trade costs use marked exported product lines where present. Forward cover reduces the
modelled currency exposure; factoring releases modelled receivables through debtor terms.
These are teaching approximations, not financial products or legal advice.

## Content and records

Scenarios remain JSON, with English and Kiswahili text, neutral amounts and a currency
code. Supported decisions are choice, number, allocation and cash-book practice. Earlier
forecast definitions remain in versioned content, but normal play no longer uses them.

An attempt pins its scenario snapshot and the flags used at its opening. Legacy attempts retain their observed decision order. A saved transition identifies corrected calculations and preserves the old draft; unplayed decisions use the corrected content. Records contain stable IDs, version context,
actions, forecasts, assistance, exercise answers and actual results. Chapters and replays
have separate attempts. All records remain local unless the learner deliberately shares,
prints or downloads them. Local profiles support shared phones but do not verify identity.

## Acceptance

All scenarios remain labelled as unverified. Automated checks cover arithmetic, content,
both languages and browser behaviour. The [learner test protocol](./MV-BS-TEST-001-learner-acceptance.md)
sets the field checks. No physical-device, translation or learner acceptance is implied
by a successful software check.
