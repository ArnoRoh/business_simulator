# Game design

**Status:** Current implementation on the learner-episodes branch. Deployment and field
acceptance are separate checks. See [ADR-0009](./adr/0009-learner-episodes-and-local-attempts.md).

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

At an episode boundary the learner sees the concepts encountered and a short takeaway.
They can continue or return to the chapter list. Progress also saves between boundaries.
Six observed flags can change a later chapter's opening within the existing carry rules.
There is no aggregate score and no requirement to play the chapters in order.

## Turn loop

1. Read a short situation and relevant cash, stock, customer-payment and time facts.
2. Select an action or enter an amount. The action remains editable.
3. Predict the result beside the action. The question names cash or profit and its period.
4. Run the week. This commits both action and forecast and applies one calculated result.
5. Read what changed, why it changed and the cash reconciliation. Continue when ready.

Business research is optional; its simulated time and money cost is shown before selection.
Help with words, controls and calculations is free. Opening a worked example is recorded
as assistance, without treating assistance as lower ability. There is no timer.

The detailed accounts, goal, scene and projection remain available under Show the numbers.
They do not precede the task. A projection is conditional on making no further changes.

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
The same result supplies grading, feedback, history and observations. It is never rerun
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
code. Supported decisions are choice, number, allocation and cash-book practice. Authored
prediction answers are forbidden: the current calculation is the answer source.

An attempt pins its scenario snapshot and the flags used at its opening. Legacy attempts retain their observed decision order. A saved transition identifies corrected calculations and preserves the old draft; unplayed decisions use the corrected content. Records contain stable IDs, version context,
actions, forecasts, assistance, exercise answers and actual results. Chapters and replays
have separate attempts. All records remain local unless the learner deliberately shares,
prints or downloads them. Local profiles support shared phones but do not verify identity.

## Acceptance

All scenarios remain labelled as unverified. Automated checks cover arithmetic, content,
both languages and browser behaviour. The [learner test protocol](./MV-BS-TEST-001-learner-acceptance.md)
sets the field checks. No physical-device, translation or learner acceptance is implied
by a successful software check.
