# ADR-0001 — Record architecture decisions

**Status:** Accepted
**Date:** 2026-08-02
**Deciders:** Project owner, Claude
**Related:** [D-001](../../memory/DECISIONS.md)

## Context

This project will be worked on in short, widely-spaced sessions by a small and changing
group — the project owner, contributors who join later, and AI agents that start each
session with no memory of the last.

That pattern has a specific failure mode: decisions get made, the reasoning is never
written down, and months later someone reopens a settled question, or worse, quietly
contradicts a decision they did not know existed. The cost falls on whoever has to work
out later why the system is shaped the way it is.

Design decisions here also have unusually long shadows. Choices about what the tool
measures and claims are not just technical — they determine whether the project ends up
doing the thing it was built to argue against.

## Decision

We will record significant decisions as Architecture Decision Records in `docs/adr/`,
numbered sequentially and immutable once merged.

Every ADR states not only what was decided but **what was rejected and why**, and the
condition that should reopen it.

ADRs sit alongside a lighter decision log at `memory/DECISIONS.md`, which carries
smaller decisions in full and one-line pointers to each ADR. The two are complementary:
the log is the chronological index, the ADRs are the depth.

## Consequences

**What this gets us.** A durable record of reasoning that survives contributor turnover
and agent sessions. New contributors can read themselves into the project's thinking
rather than inferring it. Settled questions stay settled, or get reopened deliberately
with the original reasoning visible.

**What this costs us.** Writing overhead on every significant decision, and the
discipline to do it at the time rather than afterwards. Some ADRs will be written for
decisions that turn out not to matter.

**What it forecloses.** Little. The main risk is the opposite failure — ADRs written for
everything, diluting the signal until nobody reads them. Hence the explicit split with
`memory/DECISIONS.md` for smaller matters.

## Alternatives considered

**No formal decision records, relying on commit messages and pull request discussion.**
Zero overhead, and adequate for a project with continuous staffing. Rejected because the
staffing here is explicitly discontinuous — commit history does not answer "why is it
like this" for someone arriving cold, and PR discussion is even harder to search after
the fact.

**A single decisions file with no ADRs.** Simpler, one place to look. Rejected because
consequential decisions need room for context, alternatives and trade-offs, and a file
that mixes two-line entries with two-page ones becomes unreadable. Kept as the
lightweight half of the pair instead.

**A wiki or external documentation tool.** Better editing experience. Rejected because
it separates decisions from the code they govern, does not version with the repository,
and adds a dependency that may not outlive the project's funding.

## Revisit if

The ADR set grows large enough that contributors stop reading it, or if a sustained team
forms such that continuity no longer depends on written records.
