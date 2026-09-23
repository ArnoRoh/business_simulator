# ADR-0015 — Separate season records and preserve earlier games

**Status:** Proposed; implemented locally under ADR-0014 for review

**Date:** 2026-09-23

**Deciders:** Implementation proposal by Codex; owner authorised the game build

## Context

The continuous business replaces the public-entry structure in the source tree.
Earlier learner records must keep their original meaning and remain accessible.
The new record must describe decisions in a changing business. It cannot establish
identity, unaided play or real execution.

## Decision

Use the native IndexedDB database `mv-bs-season`, version 1. The `runs` store holds
one record per attempt. The `meta` store holds the active attempt ID. Record schema
`mv-bs-season-record`, version 1, is separate from both earlier record formats.

A record holds its ID, local run number, random seed, dates, calculation version,
sample-rule snapshot, bilingual content version and snapshot, ordered actions,
action results and current state. Each action retains its week, phase, pending event,
interface language and opening-help context. Explicit help is an action. Monthly
goal choices are stated preferences. Time stamps are not response-speed scores.

Save the action log and resulting state in one transaction. Compare the stored revision
with the revision the page opened. Refuse a stale write. Show failed saves, keep the
unsaved state available for download, and stop further decisions until saved or reloaded.
Reload displays saved results without repeating a transaction.

Replay checks consistency with the current calculation version. Unsupported or inconsistent
records stay stored and downloadable. Consistency is not authentication. A user can edit
local records, reset browser data, share a device or receive help outside the interface.

Export JSON only on request. Label it simulated and partial, closed early, or season
reviewed. There is no upload, identity claim, composite score or programme eligibility.
The separate portal still expects its existing chapter record; it does not accept this
season record. Any future intake needs a reviewed contract and explicit learner consent.

Keep the introduction at `intro.html`, the chapters at `practice.html`, and their original
storage keys and calculations. Add `season-standalone.html` without removing either
previous standalone file. Cache the new game core on first load. Cache earlier games
when used; retain previously downloaded chapter content during worker updates.

## Consequences

Earlier records need no migration or regrading. A browser can retain several separate
season attempts. Local storage can still be cleared or evicted; downloaded records are
important. Records have no access lock on a shared phone. A run number is local context,
not proof that this is a learner's first attempt.

The record stores enough context to inspect observed actions. It does not yet provide a
new-game backup import or cross-device identity service. Export remains available at any
point. Native-language, physical-device and learner acceptance tests remain required.

## Alternatives considered

Reusing the chapter schema would imply comparable observations. Replacing an active
intro record would discard earlier evidence. Server accounts would add infrastructure
and personal-data collection before there is an operating intake contract.

## Revisit if

A programme accepts season records, the calculation rules change, a shared-phone access
lock is required, or device tests show that local record size prevents reliable saves.
