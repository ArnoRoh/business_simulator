# Business Simulator

A browser-based business simulation for entrepreneurs in the Global South, starting in
East Africa.

It does two things at once: it **teaches** business skills through consequence rather
than instruction, and it **observes** what a learner actually does — producing a
behavioural record intended as a cheap first stage of an execution test for grant
programmes and training providers.

> **Status: playable proof of concept.** Four chapters of 20 turns — a mandazi stall, a
> bakery, a factory, exporting — in English and Kiswahili, phone-first. Rough, and meant
> to be played and argued with. The Tanzanian figures are placeholders and the app says
> so on screen. See `memory/PROJECT_STATE.md` (kept privately — see below) for where
> things actually stand.

## Try it

```bash
cd app && python3 -m http.server 8000
```

Open `http://localhost:8000` — on a phone, use your computer's LAN address with both
devices on the same network. It needs a web server; opening the file directly will not
work. More in [`app/README.md`](./app/README.md).

Each turn: a situation, information you can buy with time or money, a decision — and then
**you predict what will happen before you find out.** That prediction step is the whole
design. It is the moment of engagement and the measurement at the same time, because you
cannot reliably predict a system you do not understand.

The four chapters follow one owner as her business changes shape, and each one changes
what can kill her: not knowing your margin, then running out of cash while profitable,
then building capacity you cannot fill or supervise, then meeting someone else's standard
in someone else's currency. They are **not a ladder** — a stall run well is a real
business, not a step towards a bigger one — and none is locked behind another. See
[`docs/arc.md`](./docs/arc.md).

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
