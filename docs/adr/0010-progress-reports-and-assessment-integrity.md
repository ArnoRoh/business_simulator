# ADR-0010 — Progress reports and assessment integrity

**Status:** Proposed — owner requirements recorded; detailed policy awaits review.
**Date:** 2026-09-12
**Deciders:** Project owner (requirements); detailed design pending
**Related:** [ADR-0008](./0008-learner-record-portal-and-judge.md),
[D-051 and D-053](../../memory/DECISIONS.md),
[programme draft](../MV-BS-PLAN-002-programme-follow-up.md)

## Context

The owner requires reports every two months, a six-month account of what went well or
wrong to inform progression, and penalties for obvious AI use. Earlier programme
discussion suggested monthly evidence. The new cadence takes precedence. The programme
already values records, causal explanation and adaptation over plan polish or forecast
accuracy alone. This context predates local implementation under
[ADR-0011](./0011-portal-implementation.md); deployment and field validation remain open.

## Decision

**Confirmed scope:** reports at months 2, 4 and 6, with the final reflection included
at month 6. Assess the participant's results, explanations and actions across the full
period to support progression. Prohibited AI use must have a real penalty.

**Proposed implementation:** start the clock when the first grant is available. Keep
two-month actuals and forecasts in matching periods. Monthly detail is optional. Preserve
forecasts, report versions, supporting evidence and grades. Apply deterministic financial
checks and evidence-citing AI assessment to every report and the final review. Missing
information is not zero business performance; honest failure is not an integrity breach.

The owner also requires an easy, obvious interface for varied formal education. Use
short questions, familiar money words, worked help, automatic totals and saved progress.
Ask detailed accounting questions only where relevant. Do not call cash left profit or
assess profit without sufficient data. Grade meaning and evidence, not writing skill,
education, speed or permitted language/accessibility assistance.

Assess records, execution, understanding, adaptation and readiness for the next fixed
tranche separately. Generate a reasoned progression recommendation. Thresholds, ties,
funding authority and later tranche amounts remain unresolved.

**Proposed integrity policy:** allow language/accessibility tools that preserve the
participant's facts and reasoning. Prohibit outsourcing assessed reasoning/reflection
to AI and fabricated evidence. Require an evidence-based finding; detector percentages,
typing speed, paste activity and writing style are insufficient on their own.
Confirmed outsourcing removes credit for the affected answer/criterion. Repeated
deliberate misuse or material fabrication can prevent progression. Keep the content
grade, finding, penalty and effective result separately. AI proposes findings; a reviewer
confirms contested or funding/progression-changing penalties, with an applicant response
route. Severity and procedure are proposals, not owner-approved selection rules.

This ADR does not accept ADR-0008, select hosting, establish legal compliance, approve
live data collection or authorise deployment. The programme draft holds the field-level
proposal. Consent and financial-data protections in SECURITY.md still apply.

## Consequences

**What this gets us.** A dated account of execution and learning, with consequences for
confirmed prohibited assistance. The final reviewer can trace recommendations to evidence.

**What this costs us.** Three reporting events, private evidence retention and return
access for participants. Integrity disputes and incomplete evidence require review.

**What it forecloses.** Rewriting the original forecast, selecting on polished final
stories alone, or treating an unexplained detector score as a sufficient penalty basis.

## Alternatives considered

**Only a final report.** Less submission work, but it loses the two-month progress
record the owner requires and makes later reconstruction harder to identify.

**Monthly reports.** More frequent observations, but more reporting work. The owner
chose two-month reports. Matching two-month forecast and actual periods retain
comparability without mandatory monthly accounting tables.

**Flags without penalties.** Easy to operate, but does not meet the owner's requirement.
Keep uncertainty explicit while applying a recorded penalty when a breach is established.

**Automatic exclusion from an AI-detector score.** Cheap and quick, but does not give
sufficient evidence of prohibited conduct. The proposal uses exact evidence and a
response route for consequential findings.

## Revisit if

- Reporting effort or connection failures cause substantial missing data.
- Review finds penalties against permitted translation, dictation or original answers.
- The rubric rewards cautious forecasts or hides honest learning from failure.
- The cohort cannot provide the review capacity required for contested decisions.
