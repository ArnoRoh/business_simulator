# MV-BS-PLAN-002 — Programme work after the game release

**Status:** Implemented locally under [ADR-0011](./adr/0011-portal-implementation.md); field validation and deployment remain open. **Updated:** 2026-09-12.

See [MV-BS-RUN-001](./MV-BS-RUN-001-programme-portal.md) for the runnable service, settings and limits. The design below records the programme intent; the run guide states current behaviour.

## Proposed application journey

Finish the required game chapters → share the selected records with consent → receive
an entry code → complete a short business forecast → answer practical follow-up questions
→ submit → receive confirmation and an assessment status.

For funded participants: record the starting position → report at months 2 and 4 →
submit the month-6 report and final reflection → assess readiness for the next stage.
The owner requires this reporting cadence and penalties for obvious AI use.
[ADR-0010](./adr/0010-progress-reports-and-assessment-integrity.md) records these
requirements separately from the detailed policy proposed below.

The owner requested this review on September 12, including ideas from the MV applications
portal. This draft develops [ADR-0008](./adr/0008-learner-record-portal-and-judge.md).
It does not accept that ADR or authorise deployment. The game remains free to use without
an application. Completion is the gate; game accuracy is not an entry threshold.

**Implementation default:** completion means all four chapters. Chapter 1 alone remains a programme option that would need a separate decision.

## Simple goals and the applicant experience

The owner requires an easy, obvious interface for people with varied formal education.
The portal should help them answer five questions: What will I try? What happened?
Why? What did I change? What will I do next? Selection should use specific actions,
records and learning. School qualifications, long answers and business vocabulary must
not earn extra credit.

**Home screen:** show one next action, its date if applicable, and its status. For
example: “Your next report”, the actual start/end dates, “Not sent”, and a large
“Start report” button. Put earlier reports below it. Avoid charts, rankings and an
admin-style dashboard. After entry-code redemption, take the person straight to their
next step; returning participants continue saved work without redeeming the code again.

**Each step:** show one short question or a small related group, a labelled answer
control, “Show an example”, “Back” and one primary “Next” button. Show progress such as
“Step 2 of 6”. A label remains visible after typing. Provide “Save and leave” throughout,
with automatic local draft saving and a visible warning if saving fails. An example
explains how to answer; it must not invent the participant's answer or fill it for them.

Use short sentences in English and Kiswahili, large text and buttons, a single column,
strong contrast and words beside icons. Do not depend on colour or an icon alone.
Support screen readers, text enlargement and a numeric keyboard for money. No timer,
minimum essay length, required PDF, compulsory video or requirement to use a spreadsheet.
Short phrases and spoken answers through a facilitated route can show understanding.
Offer reading/language help without a grading penalty; optional audio must have a text
alternative and must not add an automatic download to the first load.

Make errors specific: “Enter an amount, or choose ‘I do not know yet’.” Preserve entered
answers. Distinguish “Nothing” from “I do not know yet”; never turn a blank into zero.
Show “Estimate” and “From my records” as simple choices. Do not require proof uploads
at every step. A relevant photo or a facilitated record check can be offered when needed.

Before sending, show a short summary with an “Edit” action beside each answer and a
plain explanation of who receives it. Save locally as the person works; send only after
an explicit submission action. Show “Saved on this phone”, “Waiting to send”, and “Sent”
accurately. “Sent” requires a server receipt. A pending upload must survive closing the
browser, with a clear retry action and no repeated form entry.

All quoted UI text here is draft copy for translation resources, not strings to hardcode.
Follow [the language and accessibility rules](./localization.md). Keep the assessment
rubric available in plain language, with reasons for results; do not put technical model
settings, fraud percentages or internal grading controls in the applicant's main flow.

## What to reuse from MV

The MV hiring portal source was reviewed at commit
`1676d6053dc938dbb5c99724cc0a23bb17e94f70`. These are source observations, not a test of
the deployed service or evidence that its assessments predict performance.

| Existing MV pattern | Use in this programme |
|---|---|
| Invitation codes, expiry and saved assessment state | Enter once, then return to the same application. Preserve drafts after interrupted connections. |
| Server-held assessment snapshots | Keep the exact questions and rubric used for each application. Later edits must not change an earlier assessment. |
| Server scoring for fixed answers, AI grading for explanations | Calculate money and check constraints in code. Use AI for the applicant's reasons and evidence. |
| Two short follow-ups tied to an earlier answer | Ask for the basis of one number, then change one condition and ask for a revised result. |
| Submission digests, grading leases and explicit pending states | Save before grading. Repeated requests must not create duplicate applications or competing results. |
| Review views and exports | Let authorised reviewers see the answer, cited evidence, grade and reason together. |

Source areas: `lib/invitation-code.ts`, `app/api/assessment/session/route.ts`,
`lib/assessment/assessment-snapshot.ts`, `lib/assessment/server-grading.ts`,
`lib/ai-grading.ts`, `lib/desk-task/grading.ts`, `lib/grading-lease.ts` and
`app/api/submit/route.ts` in the MV portal repository.

Reuse these patterns. A grant application should have its own records and rubric; the
MV hiring workflow and its candidate data should not become the grant system. Its full
Next.js, Vercel and Supabase-oriented stack is not required for this small pilot.

## Entry code and saved work

1. The game shows which required chapters are complete for the selected local profile.
   The learner chooses the attempts to share and sees the recipient and consent terms.
2. When online, the server validates record size, schema, required decisions and supported
   scenario/calculation versions. It checks against trusted scenario definitions, not the
   submitted `completed` flag or submitted answer keys. Unsupported legacy records need
   an explicit review route.
3. The server issues a random, single-use claim code after accepting the record set.
   Use a cryptographic random source, a database uniqueness constraint, stored token
   hashes, expiry and rate limits. A retry of the same submission returns the same claim
   outcome. Do not use the simulator's local ID helper as a security token generator.
4. Redeeming the code starts one application atomically. It does not grant continuing
   access to that applicant's financial data. Use a separate secure return credential
   and a verified contact recovery route at application, with a shared-phone sign-out.
5. Offline completion remains valid local progress. Show “code pending” until receipt
   from the server; keep export and later upload available. Never claim that an upload
   succeeded before the server confirms it.

The current export contains an attempt ID, local profile ID, scenario snapshot and
version, calculation version, completion flag and observations. Extend that boundary
for explicit submission; preserve the existing per-attempt records. Do not replace all
attempts under a single install ID as the older ADR proposes. Shared phones can hold
several learners, and an install is not a person.

**Trust limit:** a valid offline record can be fabricated or shared. Server validation
can establish consistency, not who played. A code confirms acceptance of a submitted
record; it is not identity verification or proof of unaided play. Practical follow-ups
and later evidence checks address a different part of this risk.

## Business plan fields

Use six short parts. Each part can contain a few small steps; do not put its full data
collection on one screen. The form title can be “Your business idea”. Explain that the
programme calls this a business plan, but short answers are enough. The plan is untimed.
Confirm the original forecast before showing follow-ups; retain it and later revisions.

| Part | Main question in the applicant's words |
|---|---|
| 1. What you do | “What do you sell?” Then “Who buys it?” Offer “I have not started selling yet.” |
| 2. Your next step | “What will you try in the next two months?” Ask for one action and how they will know it worked. |
| 3. Money | “How much will customers pay you?” Then “How much will you pay out?” Use one two-month period at a time, with a worked example. |
| 4. Using the grant | “What would you use the money for?” Add a few labelled amounts; show the amount left automatically. Then ask “What would this help you do?” |
| 5. If things change | “What could stop this working?” Then “What would you do?” Accept short, concrete answers. |
| 6. Keeping track | “How will you keep a record?” Offer a notebook, phone or another method without favouring one. Review and send. |

For money, collect starting business cash and estimates for months 1–2, 3–4 and 5–6.
Show real date ranges and the selected currency. Ask about money from customer payments,
money added from grants/loans/the owner, payments out and owner withdrawals separately
through relevant follow-ups. Totals come from code, never an AI guess. For expected
customer payments, ask for the basis of the estimate; a simple quantity-times-price
example can help. Do not require product-by-product accounts for the whole business.

The cash guide shows starting money + money received − money paid out = money left.
Money left is not profit. Grants and loans are not sales. Ask simple follow-ups where
relevant: “Do customers still owe you money?”, “Do you owe a supplier?”, “Do you hold
stock?” or “Did you buy equipment?” Keep the detail available to explain a cash gap;
do not require a full balance sheet or profit calculation from every applicant. Mark
profit as unassessed if the information needed to calculate it is absent. Never silently
treat cash movement as profit or an estimate as a verified figure.

No invented prices, costs or regulations. An applicant who has not started can describe
a small customer test and mark costs as estimates. Keep livelihood and growth paths
legitimate; any growth-programme eligibility rule must be stated separately.

## Resistance to outsourced answers

Use two short tasks after the forecast is fixed: explain the basis for a specific number,
then revise the forecast under a changed condition. Start with reviewed templates populated
from the applicant's inputs. Keep task difficulty comparable and save the exact variant.
For example: “Your customer now pays one month later. What happens to the cash you need?”
A separate game-record follow-up can ask how an observed decision informs this plan.
Different business conditions are not automatically a contradiction.

These tasks make generic pasted prose less useful. They do not prevent a model or another
person from answering. Check selected claims with consent before funding, and provide a
short oral or worked check when understanding remains unclear. Translation, dictation,
calculators and declared assistance need a clear policy before applicants start.
Show that policy in a short example: “You can get help to read, translate or type your
answer. The facts and reasons must be yours. Do not ask AI to make them up for you.”
Explain the proposed consequence just as plainly: “An answer made by AI for you can
lose its marks. Repeated cheating can stop you moving to the next stage.” This copy
must match the approved policy before use.

Do not import MV's copy/selection blocking, typing-speed thresholds or AI-likelihood
percentages. Do not collect keystroke cadence for this pilot. Paste and tab changes do
not establish AI use; applicants may consult their own records. Any later process flags
need a stated purpose. Keep the original content grade and any integrity penalty as
separate recorded results so a reviewer can see why credit changed.
[Research on seven detectors](https://arxiv.org/abs/2304.02819) found false accusations
against non-native English writers and evasion through rewriting. That study does not
test every current detector; it supports avoiding an unsupported authorship verdict.

### Penalties for prohibited AI use

**Owner requirement:** obvious AI use must carry a penalty. This applies to applications,
progress reports and the final reflection. The following rule is proposed for review.

Allow translation, spelling help, dictation and calculators when they preserve the
participant's own facts and reasoning. Explain the rule and ask applicants to declare
assistance. Prohibit submitting AI-generated reasoning or reflection as their own and
inventing business evidence. Declaration does not make prohibited outsourcing acceptable.

The automated assessor must cite the exact material that raises an integrity concern.
An admitted use of generated answers or supplied source material that demonstrates
outsourcing can support a finding. Copied model instructions, irrelevant assistant
phrases or a contradiction trigger a specific follow-up; alone they do not establish
authorship. Inability to explain an answer reduces demonstrated-understanding credit,
but is not by itself proof of AI use. Fabricated evidence is a separate integrity breach,
whether a person or a model created it.

**Proposed sanction:** confirmed prohibited outsourcing gives zero credit for the affected
answer or criterion. Repeated deliberate misuse or material fabrication can make the
participant ineligible for the next stage. Keep unaffected grades, the original grade,
the evidence, the penalty and the effective result. Do not apply an arbitrary percentage
deduction to the whole application or count the same breach twice.

AI can propose the finding and penalty. A reviewer confirms a contested finding or a
penalty that changes funding/progression before that decision is final. Give the
participant the reason and one route to respond, including an oral or worked check.
Pending review is a distinct state, not an automatic rejection. Publish the policy
before collection; validate it with human-written, translated, dictated and outsourced
examples in both languages. Exact sanction and appeal rules remain proposed.

## Reports every two months

**Owner requirement:** collect progress every two months, then use the six-month review
to assess who progresses. **Proposed clock:** count from the recorded date the first
grant becomes available, not the application date. Show actual due dates in the portal.
Month 6 combines the third progress report with the final reflection; it is not two forms.

| Point | Information collected |
|---|---|
| Start | Preserve the application forecast. Confirm starting business cash and grant receipt; ask about stock or money owed only where relevant. Keep changed estimates as a separate version. |
| Month 2 | Actual results for months 1–2, grant use, milestone status, what went well/wrong, one change made and a forecast for the next two months. |
| Month 4 | Actual results for months 3–4, progress on the previous actions, new constraints and the next two-month forecast. |
| Month 6 | Actual results for months 5–6, a six-month forecast-versus-actual summary, final reflection and the case for progression. |

Reuse the plan's three two-month periods. Each report opens with its actual dates and
asks for money customers paid, money paid out and money left. Bring forward the previous
closing cash as a visible starting figure to confirm or correct; retain corrections.
Ask about grants, borrowing, owner money, stock and unpaid amounts only where relevant.
Offer an optional monthly breakdown if the participant already keeps one; do not require
it. Keep estimates and unknowns explicit. Compare the same periods and money categories,
with totals calculated automatically. Never present two-month cash totals as profit.

After entry, show one comparison at a time: “You expected … Customers paid you …”.
Ask “What made the difference?” Keep the original forecast and latest revision visible
without showing a spreadsheet. Do not make the participant enter an earlier answer again.

For each report ask: What went well? What went wrong? Why? What did you change? What
result followed, or when will you check it? Request a small relevant ledger extract,
receipt or compressed photo where useful, with consent and a text/facilitated fallback.
Evidence can corroborate a claim; a photograph does not itself prove a sale. Record
actual grant use without treating a justified change of spending as a breach of a
restricted grant: the programme's grants are unrestricted.

Save drafts offline and show which reports the server received. Keep report period,
submission time and correction history. Mark late and missing reports for follow-up;
record connectivity or other explanations before inferring lack of execution. Do not
silently convert a missing report into zero business performance. The grace period and
reminder channel remain operating choices; no messages are sent by this design review.

Automatically check every report for arithmetic, cash reconciliation, inconsistent
periods, movement from previous balances and unexplained revisions. Grade its explanation
and evidence with the same versioned rubric used for the final review. Return concise
feedback and targeted questions; keep pending grades separate from missing submissions.

## Six-month reflection and progression

The final review uses the original forecast, the three progress reports and supporting
evidence. Ask the participant for their strongest result, largest miss, reasons for both,
actions taken, evidence of the effects and what they would do differently. Then ask:
“What is stopping your business now?” Then “What would the next grant help you do?” Do not turn this into a competition to request different grant amounts.

| Draft progression criterion | Evidence assessed |
|---|---|
| Records | Can the participant reconstruct what happened from records, explain gaps and reconcile figures? |
| Execution | Did they act on commitments and produce checkable results, including small customer tests? |
| Understanding | Can they explain what went well or wrong, including a difference between forecast and actual? |
| Adaptation | Did they change an action after evidence challenged an assumption, and check the result? |
| Readiness for the next stage | Is there one supported constraint and a credible use for the next fixed tranche? |

Use the draft 0–3 anchors below for each criterion, with evidence references and
“unable to assess” where evidence is missing. Keep integrity findings and penalties
visible separately. Retain the initial blind application grade as originally made.

Produce an automated recommendation with reasons: ready for progression, needs further
evidence, or not ready this round. This informs selection; it is not an automatic
payment. Ask reflection questions one at a time and show relevant earlier answers beside
them. Accept a few specific words or a facilitated spoken answer; do not demand an essay.
Fund availability, thresholds, tie rules and decision authority still need
agreement. Do not rank by revenue growth or forecast accuracy alone. A founder who
missed the target, kept reliable records and adapted may show more readiness than one
who hit the target but cannot explain why. Honest reporting of failure must remain useful.

## Automatic assessment

Assess every submitted section. Separate deterministic checks, AI judgments and review
status. A provider failure is pending or unavailable, never a zero for the applicant.
Grade the meaning, evidence and response to change. Do not grade spelling, grammar,
answer length, education, typing speed or use of permitted reading help. Do not award
extra credit merely for completing optional fields. A missing fact can require a
follow-up; an irrelevant field must not count against the applicant.

| Draft criterion | Assessment |
|---|---|
| Financial consistency | Code checks entered amounts, periods, cash movement and grant allocation. Ask about gaps in plain words; do not penalise a participant for not doing arithmetic the form does for them. |
| Basis for the forecast | AI checks whether the stated assumptions have specific support. It must cite the relevant answer fields. |
| Bottleneck and grant use | AI checks whether the spending addresses the named constraint and whether the applicant explains how. |
| Response to change | Code checks revised numbers; AI checks the causal explanation and proposed action. |
| Records and learning | AI checks whether the proposed records can support the later forecast-versus-actual review. |

For judgment criteria, test a simple 0–3 rubric: 0 = absent or contradicted;
1 = assertion without support; 2 = coherent answer with partial support;
3 = coherent answer with specific support and a way to check it. “Unable to assess” is
separate from 0. These anchors are a draft, not validated selection weights. Store the
criterion results separately; do not invent an overall entrepreneur score or a grant
cut-off during implementation.

The initial forecast grade must be blind to identity and game observations. Grade the
game follow-up separately after that result is saved. Retain the original answers,
question versions, rubric, prompt, model identifier/settings, input digest, timestamps
and each grading run. A rerun creates a new result; it does not erase the first.

Treat applicant text and attachments as untrusted data. The grader gets no tools that
can send messages, alter records or allocate funds. Validate the output shape, ranges,
answer IDs and evidence references. A prompt instruction alone is not protection from
an applicant telling the model to award full marks.

Automatic grading covers all applications. Grant award rules remain a separate programme
decision: how the 50 places are allocated, how ties are handled, what gets reviewed and
how an applicant can challenge an error. An automated grade does not itself authorise
payment. Benchmark the rubric against independent human assessments in both languages,
including concise answers, pre-revenue cases, arithmetic errors, AI-assisted answers and
prompt injection. Measure disagreement and changed rankings before operational use.

## Smallest implementation to test

Keep the vanilla offline game. Add a small portable HTTP service with a relational store
and a mobile application form. SQLite is a candidate for this pilot, subject to the ADR
and hosting decision. Add private evidence storage only for the evidence types required.
One grading worker with durable jobs and bounded retries is sufficient initially.

Build and test one complete route with synthetic records: game completion → consented
upload → claim/redeem → save/resume → frozen forecast → two follow-ups → automatic grades
and reasons → grant start → reports at months 2/4/6 → final reflection → progression
recommendation and reviewer export. Verify altered records, shared profiles, repeated claims,
expired codes, interrupted uploads, competing saves, provider failure and deletion.
Also verify report dates and periods, late reports, preserved forecasts/corrections,
penalty evidence and reversals, allowed assistance and an honest unsuccessful business.
Then test it with intended users on low-end phones. Do not present a clickable demo or
successful endpoint check as proof of business acceptance. Use the portal tasks in
[the learner acceptance protocol](./MV-BS-TEST-001-learner-acceptance.md); ease of use
remains unverified until intended participants can complete them.

## Programme decisions still needed

Before an application portal or AI judge is built, settle the cohort date, recruitment
channels, language needs in Tanzania and Ethiopia, operating funds and review capacity.
Support experienced candidates who do not yet operate a firm. Keep fixed grant tranches
and working-capital needs consistent with the programme decisions.

Specify consent, person matching across shared or replaced phones, record retention and
withdrawal. A local profile is not a person identifier. Optional submissions do not count
silent drop-outs. Define starts, eligible applicants, completion and follow-up denominators.

Specify blind forecast review before game-record follow-up probes, reviewer and model
versions, handling of incomplete evidence and the limits of a 50-grant pilot. Non-completers
are not automatically a causal comparison group. Photographs do not by themselves verify
paid sales, durable jobs or causality.

Match attributed benefits to the intervention being costed. The present calculation
excludes later grant tranches. Do not present it as the full multi-stage programme cost
or as measured impact. A non-significant pilot result cannot establish that a filter has
no value. Revise ADR-0008 before approving external submission or judging.
