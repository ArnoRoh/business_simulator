# ADR-0006 — No build step: vanilla ES modules, zero dependencies

**Status:** Accepted
**Date:** 2026-08-02
**Deciders:** Project owner, Claude
**Related:** [ADR-0002](./0002-mobile-first-offline-pwa.md), [D-006](../../memory/DECISIONS.md)

## Context

[ADR-0002](./0002-mobile-first-offline-pwa.md) fixed the delivery target as a
mobile-first, offline-capable PWA for low-end Android devices, with a hard constraint
that learners pay for their own data. Building the proof of concept forced a choice
about how that PWA is actually constructed.

The default answer in 2026 would be a framework with a bundler — React or Svelte on
Vite. That brings component structure, state management and a large ecosystem.

It also brings a `node_modules` tree, a build step between source and running code, and
a baseline payload before a single line of the application is written.

Two further constraints are specific to this project:

- **Scenarios must be authorable by non-programmers.** People with local business
  knowledge need to write and review content ([`../game-design.md`](../game-design.md),
  "Content model"). That argues for content as plain data files, and against anything
  that requires a toolchain to edit.
- **The project must remain portable and auditable across whatever funding supports
  it** (`AGENTS.md` §3). A dependency tree is a maintenance liability for a small
  grant-funded project that may go quiet for months at a time.

## Decision

The application is written in **plain ES modules with no build step and no runtime
dependencies**. Files are served as they are written. Scenarios are JSON.

There is no bundler, no transpiler, no package manager in the application path. The two
Node scripts under `scripts/` use only the standard library.

## Consequences

**What this gets us.**

The entire application is around **33KB gzipped**, including content — a figure a
framework's runtime alone would exceed. On a metered connection that is the difference
between a learner trying it and not.

The source is the artefact. A contributor can open a file, change it, reload, and see
the result — no install, no build, no version drift. For a project that will be picked
up intermittently by people who are not full-time developers, that matters more than
ergonomics during a long focused session.

Auditing is straightforward: there is no third-party code to review or keep patched, and
no supply-chain surface at all.

**What this costs us.**

No component model. DOM construction is manual and more verbose, and it will get harder
as the interface grows. No reactive state binding — `main.js` re-renders explicitly, and
that discipline has to be maintained by hand.

No TypeScript, so no type checking across module boundaries. The engine's `applyEffects`
already demonstrates the risk: a plain number and a string-prefixed number mean different
things, and a content error there produced silently wrong economics until a validator
caught it.

No test framework, so `scripts/test-engine.mjs` is hand-rolled assertions.

**What it forecloses.**

Little that is expensive to reverse. Adding Vite later is a contained change — the
modules are already ES modules. **This decision is far cheaper to reverse than most**,
which is part of why it is defensible now.

## Alternatives considered

**React or Svelte on Vite.** The conventional choice, with real benefits once the
interface becomes complex. Rejected for the proof of concept on payload and on
contributor friction: it optimises for a sustained professional development team, which
this project does not have and may never have. Worth revisiting if the UI outgrows
manual DOM construction.

**Vanilla JS but with a bundler** for minification and cache-busting. Genuinely
tempting — it would cut the payload further without adding runtime dependencies.
Rejected for now only because it reintroduces the build step, which is the part that
hurts intermittent contributors. This is the most likely first change if the size
budget tightens.

**Server-rendered application.** Would move complexity off the device. Incompatible with
the offline requirement in ADR-0002.

**Scenarios as JavaScript modules** rather than JSON. Easier to author with comments and
computed values. Rejected because it makes content executable, puts it out of reach of
non-programmers, and would let an author hand-write outcomes — which the engine design
specifically prevents, so that the economics stay internally consistent.

## Revisit if

- The interface grows to the point where manual DOM construction is producing bugs
  rather than just verbosity.
- Contributors with front-end backgrounds join and find the absence of a framework a
  barrier rather than a simplification.
- The payload budget tightens enough that minification is required — take the bundler
  before taking a framework.
- Type errors across module boundaries start costing real debugging time; TypeScript via
  JSDoc annotations would be the cheapest first step, since it needs no build.
