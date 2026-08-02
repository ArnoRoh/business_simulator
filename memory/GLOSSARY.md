# Glossary

Shared vocabulary. Add a term when it is used in a way a newcomer would not guess, or
when precision matters and drift is likely.

Marked **[project]** for terms we have defined ourselves, **[domain]** for established
usage, **[regional]** for East African specifics.

---

## Core distinction

**Livelihood enterprise** *[domain]* — A business whose primary function is to provide
the owner with work and household income. Owner-operated, low barriers to entry, little
fixed capital, family or casual labour, profits largely withdrawn for consumption.
Legitimate and valuable; simply not the same thing as a growth firm. See
[`docs/context/transformational-entrepreneurship.md`](../docs/context/transformational-entrepreneurship.md).

**Transformational enterprise** *[domain]* — A business intended and able to build an
organisation larger than its founder: employs non-family workers, delegates management,
invests in machinery and systems, serves national/export/B2B markets, reinvests for
growth, and can eventually operate without the founder. Attributed to Antoinette
Schoar. **Not a value judgement about the owner** — see Q-006.

**Structural transformation** *[domain]* — Economy-wide shift toward higher
value-added-per-worker activity. The outcome transformational firms contribute to and
livelihood firms generally do not, which is why the distinction matters for policy.

## Project terms

**Behavioural record** *[project]* — The trail of decisions a learner makes across a
playthrough: what they chose, under what information, how they responded when
assumptions broke. The primary output of the simulator, and deliberately *not* a plan
or pitch document. See ADR-0004.

**Readiness profile** *[project]* — A human-readable summary derived from the
behavioural record, intended for programme staff assessing a candidate. Reports what
was observed in simulation. Never asserts a prediction about real firm performance —
see `docs/assessment.md`.

**Execution test** *[project/domain]* — A selection method that observes what a
candidate actually does — securing a paid trial, delivering a sample, establishing unit
economics, recruiting a collaborator, keeping records, updating when assumptions change
— rather than assessing what they say they will do. The simulator is intended as a
cheap, scalable *first stage* of one.

**Bottleneck** *[project/domain]* — A single specific constraint whose removal changes
a firm's trajectory: a machine, a certification, a technical hire, a lab test, a market
requirement. Central to the funding model the project is built around — programmes
should remove verified bottlenecks rather than fund generic growth.

**Capability jump** *[project/domain]* — A discrete investment that moves a firm across
an organisational threshold, as opposed to incremental working-capital spending on
wages, rent and stock.

**Trajectory** *[project]* — The path a learner is playing toward (livelihood
consolidation vs. transformational growth). Learner-chosen, never assigned by the
system.

## Programmes and evidence

**MbeleNaBiz** *[regional]* — World Bank–supported Kenyan business-plan competition.
Source of the finding that a ~US$9,000 grant produced roughly two additional workers
after ~3 years, while ~US$36,000 added little more. The critique of how its employment
effects were measured is the project's starting point.

**YouWiN!** *[regional]* — Nigerian business-plan competition, grants averaging
~US$50,000. Among the strongest evidence that large transfers to selected applicants can
produce larger firms — while also showing that judges' plan scores predicted winners
poorly.

**Recoverable grant** *[domain]* — Support repaid only if the firm reaches an agreed
revenue or profitability threshold; recoveries fund later cohorts.

**Additionality** *[domain]* — The share of an observed outcome that would not have
happened without the intervention. Central to honest impact claims and routinely
overstated.

**Displacement** *[domain]* — Gains at supported firms that come at the expense of
unsupported competitors, so gross effects overstate net economy-wide effects.

## Regional and operational

**Formalisation** *[regional]* — Registration, licensing, tax enrolment and regulatory
compliance. Often far more expensive and slower than programme designers assume, and
frequently the decisive constraint. Costs must be modelled honestly, never hand-waved.

**Mobile money** *[regional]* — Phone-based payment and transfer systems (M-Pesa,
Tigo Pesa, Airtel Money, MTN MoMo). The default payment rail for most target learners;
any cash-flow modelling that ignores transaction fees and float will feel wrong to them.

**Value chain** *[domain]* — The linked stages from primary production to end customer.
Transformational firms typically build or upgrade these, e.g. the beekeeper → aggregator
→ processor → certified exporter chain in honey.

**MRV** *[domain]* — Measurement, Reporting and Verification. Certification
infrastructure required in carbon and standards-driven markets; an example of a
compliance capability too expensive for individual small firms to recreate.

**Anchor firm** *[domain]* — An established firm large enough that new suppliers and
service businesses can be spawned around it, using its purchase commitments as demand.

## Project entities

**Upendo Honey / Third Man Ltd** — Owner's Tanzanian honey business (~130 employees,
thousands of beekeeper suppliers, export markets, international certifications). A
primary source of ground truth for scenario realism, and the leading candidate for the
first worked scenario.

**Tanganyika Blue** — Owner's capital-intensive Tanzanian aquaculture venture.

**Dark Earth Carbon** — Owner's industrial carbon-removal venture; an example of a firm
whose impact is poorly captured by employee headcount.
