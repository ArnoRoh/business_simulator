# MV-BS-DES-003 — Business plan questions: research basis and proposal

**Business Simulator · Masika Ventures**

**Status:** Proposal for owner review. Not accepted. No code change.

**Date:** 2026-09-30

**Related:** [D-036](../memory/DECISIONS.md), [D-037](../memory/DECISIONS.md),
[D-053](../memory/DECISIONS.md), [D-054](../memory/DECISIONS.md),
[ADR-0010](./adr/0010-progress-reports-and-assessment-integrity.md),
[ADR-0011](./adr/0011-portal-implementation.md), current form in `app/portal/app.js`
(`stepsFor`) and `app/portal/model.js`.

---

## 1. Recommendation

Use the business plan for three jobs. Do not use it to rank writing or plan quality.

1. **Record a baseline.** Collect the same few numbers that the reports at months 2, 4
   and 6 ask again.
2. **Record commitments that we can check.** Collect a specific purchase, a dated action
   and a forecast with a range.
3. **Collect a small number of signals that research links to growth.** Collect business
   practices, current trading and evidence of earlier action.

Ask most questions as numbers or choices. Ask for free text only where the answer is a
specific plan (the test and the dated action). Grade specificity, consistency and later
follow-through. Do not grade how well the applicant writes.

## 2. What the research shows

| Finding | Source | Consequence for the form |
|---|---|---|
| Judges' business-plan scores did not predict survival, employment, sales or profit three years later (more than 2,100 entrants). A few owner traits had some predictive power. Machine learning did not improve prediction. All methods had low predictive power. | McKenzie & Sansone 2019 (Nigeria, YouWiN!) | Do not select on plan quality. Keep the plan short. Use it for baseline and commitments. |
| Expert panels added some prediction beyond surveys. Survey measures of ability explained more of the variance in growth. | Fafchamps & Woodruff 2017 (Ghana) | Simple, structured facts can be as useful as judged narrative. |
| 26 questions on marketing, stock control, record keeping and financial planning. A better practice score goes with higher sales, profit, productivity, survival and sales growth. Seven countries, more than 20,000 firms. | McKenzie & Woodruff 2017 | Ask a short practices checklist. Ask it again in reports to measure change. |
| Asking profit directly gives a more accurate figure than revenue minus detailed costs. Firms under-reported revenue by about 30% against their account books. | de Mel, McKenzie & Woodruff 2009 (Sri Lanka) | Ask profit as one direct question. Do not calculate profit from many parts. |
| Recall error increases with the length of the recall period. | de Nicola & Giné 2014 (India) | Ask about last week or last month. Do not ask for two-month totals. |
| Probability ranges can be asked reliably in low-income settings with simple visual aids. | Delavande, Giné & McKenzie 2011 | Ask a forecast as lowest, most likely and highest. Check calibration later. |
| Forecast errors in both directions went with lower profit (large Japanese firms). | Tanaka, Bloom, David & Koga 2020 | Calibration is a plausible signal. This evidence is not from microenterprises. |
| Participants who set more ambitious goals mostly fell far short of them (microfinance clients, Philippines). | NBER w28607 | Do not reward a high target. Reward a calibrated one. |
| Businesses that existed before microfinance arrived gained much more (35% more assets, double revenue after six years). Others gained almost nothing. | Banerjee, Breza, Duflo & Kinnan 2019 (India) | Ask if the applicant trades now, and for how long. |
| Farmers who chose to borrow had seasonal returns to a grant of about 130%. Those who did not choose had returns near zero. | Beaman, Karlan, Thuysbaert & Udry 2023 (Mali) | Self-selection carries information. A short plan with a real effort cost can help selection. |
| Community rankings identified owners with 23–35% monthly returns to capital. The average was 11%. Rankings were distorted when they could affect who got money. | Hussam, Rigol & Roth 2022 (India) | Peer information is useful but needs careful design. It is outside this form. |
| In-kind grants increased profit for women's larger businesses. Cash did not. Capital did not grow women's smallest businesses. | Fafchamps, McKenzie, Quinn & Woodruff 2014 (Ghana) | Ask for the exact item, supplier and price. Consider paying the supplier directly. |
| Women's apparent low return to capital was often because the money went into a husband's business. | Bernhardt, Field, Pande & Rigol 2019 | Ask which business will use the purchase. Ask what the household takes each week. |
| Rule-of-thumb training (for example, keep business and household money separate) improved practices and revenue. Standard accounting training did not. | Drexler, Fischer & Schoar 2014 (Dominican Republic) | Include "separate business money" in the practices checklist. |
| Training that emphasised self-starting action increased profit by 30%. Traditional training gave 11%, not significant. | Campos et al. 2017 (Togo) | Ask for one specific action with a date. |
| Entrepreneurs taught to state hypotheses and test them performed better and changed or stopped weak ideas more often. | Camuffo et al. 2020; replication 2024 (Italy) | Ask what must be true, the small test, and which result would change the plan. |
| Goal intentions led to action only when action planning was high. | Gielnik et al. 2015 (Uganda) | A dated action plan is more informative than a stated goal. |
| YouWiN! paid grants in four tranches, each after the owner reached a milestone. | McKenzie 2017 (Nigeria) | The dated action and forecasts can set tranche conditions later. |
| Grant alone had no effect on Dar es Salaam microentrepreneurs. Training helped men's sales and profit by about 20–30%. | Berge, Bjorvatn & Tungodden 2015 (Tanzania) | A grant is not enough by itself. Target the bottleneck. |
| Most microentrepreneurs run a business from necessity. Few want to hire. | Jayachandran 2021 (review) | Record ambition. Do not grade it. |
| Some small firms have high returns but are held back by external constraints such as capital. | Grimm, Knorringa & Lay 2012 (West Africa) | The bottleneck question can find these firms. |
| An AI business assistant helped high performers by about 15%. It made low performers about 8% worse. | Otis et al. 2024 (Kenya) | Numbers and choices resist AI writing better than long text. This supports the integrity rule in ADR-0010. |
| Grant gains in Uganda disappeared after nine years. Assets and skills remained. | Blattman, Fiala & Martinez 2020 | Six months is short. Treat early results with care. |

## 3. Gaps in the current form

- There is no baseline. Only opening cash is asked. Months 2, 4 and 6 have nothing to
  compare with.
- It asks for 12 cash amounts for three two-month periods. That is the longest recall
  and the heaviest task. It is also the least reliable measure.
- "How will you know it worked?" and "What would this help you do?" invite writing. They
  do not produce a number that we can check.
- It has no dated milestone, no unit count and no range. D-036 asked for these.
- It does not ask if the applicant trades now, or how the business works today.

## 4. Proposed questions

About ten screens. Each screen has one short group of questions. English and Kiswahili.
Every amount allows "I do not know yet", which is kept separate from zero.

### A. Your business now (baseline)

1. **What do you sell?** Short text.
   **Are you selling now?** Yes / Not yet. **If yes, since when?** Month and year.
2. **A normal week:** How many do you sell? What is the price of one?
   What does one cost you to make or buy?
3. **Last month:** After you paid all business costs, how much did the business make?
   One amount. (Adapted from de Mel et al. 2009.)
   **Who works in the business?** You only / family / paid workers (number).
   **In a normal week, how much does the household take from the business?**
4. **What do you do now?** Yes/no checklist, about eight items, adapted from McKenzie &
   Woodruff 2017 and Drexler et al. 2014:
   - I write down every sale.
   - I write down every purchase.
   - I know what one item costs me.
   - I keep business money separate from household money.
   - I compared prices from more than one supplier in the last three months.
   - I asked customers what they want in the last three months.
   - I know how much stock I have without counting it again.
   - I have a sales target for the next months.

   Optional: one photo of your records (D-037).

### B. What you have already done

5. **What have you already done to test this?** Choose all that apply:
   sold samples / have a paid order / a buyer agreed a price / kept records for
   __ weeks / nothing yet. Optional photo.

### C. The plan

6. **What one thing stops you selling more now?** One choice: money for stock /
   equipment / not enough customers / my time / skills / a permit or standard /
   transport / other. One short line of detail.
7. **What exactly would you buy with the grant?** Item, supplier, price.
   **Which business will use it?** This business / another household business.
   The form shows the amount kept for later.
8. **Forecast.** In a normal week at month 2, month 4 and month 6, how many will you sell?
   At month 6, how much will the business make in one month: lowest, most likely and highest?
   **What is this based on?** My records / a recent order / a small test / my guess.
9. **One action with a date.** What will you have done, and by what date?
   Example: "First order from a school by 15 December."
10. **What must be true for this to work? What small test will you do first? Which
    result would make you change the plan?** Three short answers.

Then contact details, the help declaration and review, as now.

**Record only, do not grade:** "In one year, do you plan to pay someone outside your
family to work in the business?" Yes / No / Not sure.

### Questions to remove

The 12-amount cash table, "How will you know it worked?", "What would this help you do?"
and the separate risk screen. Question 10 replaces the risk screen.

## 5. Assessment

**At application**, use checks that a rule can run where possible:

- Practices count (0–8).
- Specificity: the item, supplier and price are present; the action has a date;
  the forecast has numbers.
- Consistency: the price is more than the cost of one; the purchase is within the grant;
  the forecast range is in order. Flag a large jump from baseline for review. Do not
  score it down.
- Evidence of earlier action (question 5).

Use the AI assessor only for question 10. Grade whether the test is specific. Do not
grade the writing.

**At months 2, 4 and 6**, ask the baseline questions again: weekly sales, profit last
month, the practices checklist and a records photo. Grade the three things in D-036:

1. Did they track it?
2. Is the actual inside their range, and how far from their most likely value?
3. Can they explain the difference?

Also check whether the dated action happened and the purchase photo matches question 7.

## 6. Limits

- No study shows that these questions predict success in Tanzania. Overall predictive
  power in this field is low (McKenzie & Sansone 2019). The pilot must keep records
  for all applicants to test this (Q-034).
- Self-reported practices can rise when money depends on them. Check a sample with
  photos and at follow-up.
- The forecast-accuracy evidence comes from large firms. Its value for microenterprises
  is an assumption.
- The research does not give the item wording for Tanzania. Local review and learner
  tests (MV-BS-TEST-001) must check wording and burden.

## 7. Decisions for the owner

1. Accept the three jobs in section 1 as the purpose of the plan.
2. Accept the baseline-and-repeat structure: weekly sales, profit last month and practices.
3. Choose the forecast form: the range at month 6 as proposed, or one value for each period.
4. Choose if applicants who have not started selling can apply.
5. Choose if the programme pays the supplier directly for the item in question 7.
6. Keep peer or community information outside this form for now (Hussam et al. 2022).

## 8. Sources

- McKenzie, D. & Sansone, D. (2019). Predicting entrepreneurial success is hard. *Journal of Development Economics* 141. https://ideas.repec.org/a/eee/deveco/v141y2019ics0304387818305601.html
- Fafchamps, M. & Woodruff, C. (2017). Identifying gazelles. *World Bank Economic Review* 31(3). https://www.povertyactionlab.org/evaluation/gazelles-ghana-identifying-high-growth-firms-through-panel-judges-or-survey-instruments
- McKenzie, D. & Woodruff, C. (2017). Business practices in small firms in developing countries. *Management Science*. https://www.nber.org/papers/w21505 ; summary: https://www.theigc.org/blogs/bad-practices-hold-back-small-firms-developing-countries
- de Mel, S., McKenzie, D. & Woodruff, C. (2009). Measuring microenterprise profits. *Journal of Development Economics* 88(1). https://ideas.repec.org/a/eee/deveco/v88y2009i1p19-31.html
- de Nicola, F. & Giné, X. (2014). How accurate are recall data? *Journal of Development Economics* 106. https://ideas.repec.org/a/eee/deveco/v106y2014icp52-65.html
- Delavande, A., Giné, X. & McKenzie, D. (2011). Eliciting probabilistic expectations with visual aids. *Journal of Applied Econometrics* 26(3). https://ideas.repec.org/p/wbk/wbrwps/5458.html
- Tanaka, M., Bloom, N., David, J. & Koga, M. (2020). Firm performance and macro forecast accuracy. *Journal of Monetary Economics* 114. https://ideas.repec.org/a/eee/moneco/v114y2020icp26-41.html
- Aspirations and financial decisions: experimental evidence from the Philippines. NBER Working Paper 28607. https://www.nber.org/system/files/working_papers/w28607/w28607.pdf
- Banerjee, A., Breza, E., Duflo, E. & Kinnan, C. (2019). Can microfinance unlock a poverty trap for some entrepreneurs? NBER WP 26346. https://www.nber.org/papers/w26346
- Beaman, L., Karlan, D., Thuysbaert, B. & Udry, C. (2023). Selection into credit markets. *Econometrica*. https://www.nber.org/papers/w20387
- Hussam, R., Rigol, N. & Roth, B. (2022). Targeting high ability entrepreneurs using community information. *American Economic Review* 112(3). https://econpapers.repec.org/article/aeaaecrev/v_3a112_3ay_3a2022_3ai_3a3_3ap_3a861-98.htm
- Fafchamps, M., McKenzie, D., Quinn, S. & Woodruff, C. (2014). Microenterprise growth and the flypaper effect. *Journal of Development Economics* 106. https://econpapers.repec.org/RePEc:eee:deveco:v:106:y:2014:i:c:p:211-226
- Bernhardt, A., Field, E., Pande, R. & Rigol, N. (2019). Household matters. *AER: Insights* 1(2). https://www.aeaweb.org/articles?id=10.1257%2Faeri.20180444
- Drexler, A., Fischer, G. & Schoar, A. (2014). Keeping it simple. *AEJ: Applied* 6(2). https://www.aeaweb.org/articles?id=10.1257/app.6.2.1
- Campos, F. et al. (2017). Teaching personal initiative beats traditional training. *Science* 357. https://www.science.org/doi/10.1126/science.aan5329
- Camuffo, A., Cordova, A., Gambardella, A. & Spina, C. (2020). A scientific approach to entrepreneurial decision making. *Management Science*. Replication: *Strategic Management Journal* (2024). https://sms.onlinelibrary.wiley.com/doi/full/10.1002/smj.3580
- Gielnik, M., Frese, M. et al. (2015). Action and action-regulation in entrepreneurship. *Academy of Management Learning & Education*. https://business.uoregon.edu/sites/default/files/media/Gielnik_Frese_et-al_2015.pdf
- McKenzie, D. (2017). Identifying and spurring high-growth entrepreneurship. *American Economic Review* 107(8). https://pubs.aeaweb.org/doi/pdfplus/10.1257/aer.20151404
- Berge, L. I. O., Bjorvatn, K. & Tungodden, B. (2015). Human and financial capital for microenterprise development. *Management Science*. https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1933
- Jayachandran, S. (2021). Microentrepreneurship in developing countries. *Handbook of Labor, Human Resources and Population Economics*. https://seemajayachandran.com/microentrepreneurs.pdf
- Grimm, M., Knorringa, P. & Lay, J. (2012). Constrained gazelles. *World Development* 40(7). https://ideas.repec.org/a/eee/wdevel/v40y2012i7p1352-1368.html
- Otis, N. et al. (2024). The uneven impact of generative AI on entrepreneurial performance. *Management Science*. https://doi.org/10.1287/mnsc.2024.06909
- Blattman, C., Fiala, N. & Martinez, S. (2020). The long-term impacts of grants on poverty. *AER: Insights*. https://www.aeaweb.org/articles?id=10.1257%2Faeri.20190224

Findings are from abstracts, author summaries and programme pages. Full texts were not
read in this session. Check exact figures against the papers before external use.
