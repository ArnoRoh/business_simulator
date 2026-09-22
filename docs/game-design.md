# Game design

**Status:** The public entry is a short introduction. The full four-chapter game is
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
