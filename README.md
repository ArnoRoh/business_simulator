# Business Simulator

A browser-based business simulation for entrepreneurs in the Global South, starting in
East Africa.

It does two things at once: it **teaches** business skills through consequence rather
than instruction, and it **observes** what a learner actually does — producing a
behavioural record intended as a cheap first stage of an execution test for grant
programmes and training providers.

> **Status:** The source now opens one continuous business season in English and
> Kiswahili. You run a mandazi stall with stock, repeat customers, debts, household
> needs and staff. The 24-week setting and all commercial figures are samples for
> testing. Learner, local-commercial and native-language review remain open.

## Play the game

The [public site](https://arnoroh.github.io/business_simulator/) still runs the earlier
release until a separate deployment. This branch does not change that site.

For the new game, serve `app/` locally or open
[the new offline file](./app/season-standalone.html) directly. Start trading with the
ready plan; change it when needed. Cash, profit and sales stay visible. Short animations
show cash sales, credit deliveries, customers leaving and waste. There is no timer or
required profit prediction. The core works offline after its first successful load.

A steady livelihood and a business that can operate while you are away are both valid
goals. There is no entrepreneur score. The record describes simulated choices, not
verified real execution or grant eligibility. Data stays on the device unless you
choose to download and share it.

Earlier games and records remain available at `intro.html` and `practice.html`.
See [the current design](./docs/MV-BS-DES-002-continuous-business-pipeline.md).

## Run the programme portal locally

Run `npm run portal` with Node 22.13 or newer. Open `http://127.0.0.1:8787/portal/`.
The portal has guided applications, saved drafts, reports at months 2/4/6 and reviewer
controls. It starts in sample mode. AI grading needs a configured provider.
See [the run guide](./docs/MV-BS-RUN-001-programme-portal.md). This service is not deployed
on the public game site.

## Explore it with an AI agent

You can ask an AI agent to inspect the idea, documentation and code without setting up
the game yourself.

### If the agent can open public links

Give it this repository URL:

`https://github.com/ArnoRoh/business_simulator`

Then paste this prompt:

> Explore this repository without changing it. Read `AGENTS.md` first, especially
> sections 1–6, and then read `docs/context/transformational-entrepreneurship.md`.
> Play or inspect the app if your tools allow it. Explain what the project is trying to
> do, how the continuous business and preserved earlier games work, what is already built, and the most important open
> risks or questions. Distinguish measured facts from assumptions. The public repository
> does not include the private `memory/` directory, so flag missing context instead of
> inventing it.

### If the agent works with local files

Clone the repository instead of copying its files one by one:

```bash
git clone https://github.com/ArnoRoh/business_simulator.git
cd business_simulator
```

Open that folder in the coding-agent tool, then use the prompt above. An agent that wants
to run the served app locally can use:

```bash
cd app
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The generated
[`app/season-standalone.html`](./app/season-standalone.html) can also be opened directly without a
server. More technical detail is in [`app/README.md`](./app/README.md). If the agent will
make changes rather than only explore, also read [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Why this exists

Development programmes select and fund small firms using business plans and pitches. The
evidence says those signals predict future performance poorly, while **observed
execution** predicts better — but running a real execution test per candidate is
expensive, so programmes fall back on the cheap signal that does not work.

At the same time, reported results are routinely overclaimed: employment gains come from
entrepreneur surveys rather than verified records, and livelihood support gets described
as transformational job creation.

This project tries to make the better signal cheap enough to use at scale.

The full argument is in
[`docs/context/transformational-entrepreneurship.md`](./docs/context/transformational-entrepreneurship.md).
It is the foundation of everything here — read it first.

## What this is not

- **Not a business-plan generator.** Deliberately. See
  [ADR-0004](./docs/adr/0004-simulator-as-selection-instrument.md).
- **Not a pitch trainer or personality assessment.**
- **Not a predictor of real-world success.** We have no validation that in-simulation
  behaviour predicts real firm outcomes, and we do not claim it. See
  [`docs/assessment.md`](./docs/assessment.md).

## Design constraints

Not preferences — they come from the operating context:

- Mobile-first, low-end Android, small screens
- Works offline after first load; learners pay for their own data
- Localisable from day one, Swahili first-class
- Tolerant of varied literacy and numeracy
- Learner data minimised, consent-based, learner-controlled

## Documentation

| Start here | |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Operating guide for contributors and AI agents. **Read §2 before proposing features.** |
| [`docs/`](./docs/) | Design and domain documentation — [index](./docs/README.md) |
| `memory/` | Decisions, discussions, open questions, session history — **not published**, see below |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to propose changes |

The `memory/` directory is unusual and load-bearing: this project is built in short,
widely-spaced sessions by people and AI agents who do not share context, and that
directory is how continuity survives. Contributors are expected to maintain it.

**It is not in this repository.** `memory/` records private conversations — with the
project owner, with partner organisations, about people and firms who did not agree to
be written about in public — and it is deliberately candid, because a working log that
is written for an audience stops being useful. It is kept on the machine the work
happens on. Documents here link into it; on a public checkout those links will not
resolve, and that is expected rather than broken. If you are working on this project
and need the log, ask.

## Where the project needs help most

- **Local ground truth.** [`docs/context/`](./docs/context/) is deliberately empty of
  regulatory and cost detail rather than filled with plausible guesses. Real numbers for
  registration, licensing, certification and tax in Tanzania are the highest-value
  contribution available.
- **Language and register.** Swahili business vocabulary as entrepreneurs actually use
  it, not as a dictionary renders it.
- **Field reality.** The personas in [`docs/personas.md`](./docs/personas.md) are
  hypotheses, not research.

## Geographic sequence

Tanzania first, then Kenya, Uganda, Rwanda, Ethiopia. Country detail does not
extrapolate — each is separate work.
(D-005, in the private decision log)

## Licence

Dual-licensed by artefact type
([ADR-0003](./docs/adr/0003-dual-licensing.md)):

- **Source code** — [MIT](./LICENSE)
- **Curriculum, scenarios, and documentation** — [CC BY-SA 4.0](./LICENSE-CONTENT)
