# Assessment and the behavioural record

**Status:** Current record contract under
[ADR-0012](./adr/0012-play-first-business-journey.md), an implemented proposal for review. No validation against real
firm outcomes exists. Completion is the programme gate; prediction accuracy is not a
pass mark. See [the project thesis](./context/transformational-entrepreneurship.md).

## What is observed

Schema version 2 retains a separate attempt, local profile, scenario version and snapshot,
calculation version, and chronological observations. It records business research before
commitment; the committed action, numeric input or allocation; the actual
result; and learning help opened before commitment. Opening optional context is also retained, with whether it occurred before commitment. A result is calculated once and saved.

New decisions use `interactionVersion: 2` and `forecast: "not-requested"`. Normal play
has no forecast step. `inputMethod` distinguishes a preset amount, a typed amount, an
ordinary choice, an allocation or a confirmed legacy draft. Selecting a displayed price
is not independent price calculation. Historical forecasts remain as recorded. Their
absence in new play is neither an incorrect answer nor refusal to engage.

Cash-book observations contain the entered balance, opening cash, receipts, payments,
correct balance and assistance used. The example is explicitly practice. A wrong answer
does not alter actual business cash. A diagnosis retains the question context, selected
fact and answer. The factory capacity question uses current capacity and demand.

Raw observations are not overwritten when an interpretation changes. Replays are separate
attempts. Old observations with no recorded scenario or calculation version remain
`legacy-unknown`. Migration records the boundary to corrected calculations and does not
re-grade historical answers. Unreadable source records remain available for backup.

## What is derived

| Description | Basis and limit |
|---|---|
| Historical prediction accuracy | Only the older forecasts that were actually recorded, not all decisions in the current game. The predicted and calculated result. Counts with and without opened help are separate. Missing legacy assistance data is not independent work. |
| Information checked before deciding | Only research recorded before the committed action. Opening language or arithmetic help does not count as buying business information. |
| Decisions after a profit drop | The next committed decision after lower profit. This is not a measure of recovery ability; planned investment can reduce profit. |
| Concepts encountered | Concepts attached to committed decisions. Exposure is not mastery. |
| Diagnosis responses | The fact selected and its calculation or authored context. Recognition among supplied facts is narrower than independent bottleneck analysis. |
| Cash-book practice | The entered balance and the shown correction. This is not evidence that a real firm maintains accurate records. |

An indicator must link to the observations that produced it. Do not infer learning
improvement by comparing early and late accuracy on different questions. Do not treat
reading support, a slower response or an interrupted session as lower business ability.
The application does not collect a reading-speed score or penalise time spent on a task.

## What the record does not establish

Do not infer motivation, grit, honesty, leadership, intelligence or future firm growth.
Do not use a composite score, rank, percentile or automatic exclusion. A simulator record
is not verified real-world execution. It cannot verify paid sales, wages, durable jobs,
formal registration or the cause of a firm's growth. No local profile verifies identity.

Hiring, paid trials and delegation are simulated actions with stated consequences. They
provide material for learning and later questioning, not validated selection criteria.
The six carried flags describe the simulation; `keepsRecords` now includes completion of
a cash-book task and does not assert that its first answer was correct.

## Learner access and retention

Attempts and profiles live in native IndexedDB. No background transmission, analytics or
account is required. A learner can open a partial record during play, return to the task,
view earlier attempts, and deliberately download, share or print a record. Partial records
must remain labelled partial. Completion is saved after all authored and recovery turns.

Local profiles support a shared phone but have no access lock. Export names include the
attempt identifier to distinguish replays. The learner can export a backup and explicitly
delete their profile's local attempts. See [SECURITY.md](../SECURITY.md) for data rules.

External intake, consent, matching across devices, review operations and evaluation are
separate programme work. See the [follow-up plan](./MV-BS-PLAN-002-programme-follow-up.md).
Optional submission does not observe silent drop-outs. Non-completers are not automatically
a causal comparison group. An unvalidated score must not decide access to funding.

## Acceptance

Use [the learner test protocol](./MV-BS-TEST-001-learner-acceptance.md) to test navigation
and comprehension. Physical-device, native-language and commercial review are still
required. Successful software checks alone do not establish any of these outcomes.
