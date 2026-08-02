# Contributing

Thanks for looking at this. The project needs several kinds of help, and only some of
them are code.

---

## Before you start

**Read [`AGENTS.md`](./AGENTS.md), especially §2.** The project rests on a specific
argument about why grant programmes select badly, and that argument rules out several
features that otherwise look like obvious wins — a business-plan builder, pitch scoring,
personality assessment. Proposing one without having read §2 wastes your time and ours.

Then check [`memory/PROJECT_STATE.md`](./memory/PROJECT_STATE.md) for where things
actually stand, and [`memory/OPEN_QUESTIONS.md`](./memory/OPEN_QUESTIONS.md) for what is
unresolved. Several areas are blocked on decisions that have not been made yet; working
on them now means doing it twice.

---

## What is most useful

**Local ground truth.** The highest-value contribution available.
[`docs/context/east-africa-operating-context.md`](./docs/context/east-africa-operating-context.md)
is a deliberately empty checklist of things we need real numbers for: what registration
actually costs in Tanzania, how long certification really takes, what a supermarket
requires from a supplier, what mobile money costs at volume.

We left it empty on purpose. Plausible-but-wrong figures are worse than none — a learner
who spots a wrong cost stops trusting the whole tool. If you have dealt with these
processes yourself, your experience is more valuable here than published guidance, and
where the two differ we want both.

**Language and register.** Swahili business vocabulary as entrepreneurs actually use it.
Not dictionary translation, and not machine translation. See
[`docs/localization.md`](./docs/localization.md).

**Field reality.** [`docs/personas.md`](./docs/personas.md) is constructed from the
project owner's operating context, not from research. Anyone who works with these
entrepreneurs directly can tell us where it is wrong.

**Review of the interpretive documents.** `docs/vision.md`, `docs/theory-of-change.md`
and `docs/assessment.md` are an AI's first-draft reading of the owner's background note.
They may have subtly misread it.

**Code.** There isn't any yet — that is deliberate ([D-001](./memory/DECISIONS.md)).
Design comes first here.

---

## How to contribute

1. **Open an issue first** for anything substantial. Templates are in
   [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/). It saves you building
   something that conflicts with a decision you had no way to know about.
2. **Branch** from the default branch. Never commit to it directly.
3. **Make the change**, following the conventions below.
4. **Update memory** — see the next section. This is not optional.
5. **Open a pull request** using the template.

---

## Updating memory

This repository has a [`memory/`](./memory/) directory, and it is load-bearing rather
than decorative. Work here happens in short, widely-spaced sessions, often by AI agents
that start with no context. Memory is how the reasoning survives.

**If your change involved a decision**, add it to
[`memory/DECISIONS.md`](./memory/DECISIONS.md) — including **what you rejected and
why**. The rejected options are the valuable part. Without them, the next person
proposes the same thing and nobody remembers it was already considered.

**If your change was a substantial piece of work**, write a session entry in
[`memory/sessions/`](./memory/sessions/) from the template, and refresh
[`memory/PROJECT_STATE.md`](./memory/PROJECT_STATE.md).

**If you hit something you could not resolve**, add it to
[`memory/OPEN_QUESTIONS.md`](./memory/OPEN_QUESTIONS.md) rather than leaving it in your
head.

Memory updates ship **in the same pull request** as the work they describe. Full
protocol in [`AGENTS.md` §5](./AGENTS.md#5-the-memory-protocol).

---

## Conventions

**Never invent factual detail.** No regulatory processes, fee schedules, tax rates,
licence names or market prices from memory or inference. Mark uncertain claims
`<!-- UNVERIFIED -->` and log them in `OPEN_QUESTIONS.md`. This applies with particular
force to AI-assisted contributions, where confident-sounding invention is the
characteristic failure.

**Write for a second-language reader.** Short sentences, common words, terms defined on
first use. This applies to documentation as much as to the product — contributors read
in a second language too.

**No development-sector boilerplate.** Not "empower", "unlock potential", "transform
lives". Say what the thing does. Note that *transformational* is a technical term here
(see [`memory/GLOSSARY.md`](./memory/GLOSSARY.md)) — use it precisely or not at all.

**Never hardcode a currency.** Amounts are authored locale-neutral and formatted at
render time.

**No user-facing strings in code**, once there is code. Localisation is a day-one
requirement, not a later pass.

**Commits:** imperative mood, scoped prefix where it helps —
`docs: add Tanzania certification lead times`, `memory: record session 004`. One logical
change per commit.

---

## Working with AI agents

Much of the work here is done with AI assistance, and the repository is set up for it —
[`AGENTS.md`](./AGENTS.md) is the operating guide, [`CLAUDE.md`](./CLAUDE.md) points
Claude Code at it.

If you use an agent: it is your contribution and your responsibility. Check its factual
claims, especially about East African regulation and costs, where a model will produce
confident and wrong specifics. Make sure it updated memory. Read what it wrote before
you submit it.

---

## Licensing

Contributions are accepted under the repository's licences: [MIT](./LICENSE) for code,
[CC BY-SA 4.0](./LICENSE-CONTENT) for content and documentation. See
[ADR-0003](./docs/adr/0003-dual-licensing.md).

## Conduct

[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) applies to all project spaces.
