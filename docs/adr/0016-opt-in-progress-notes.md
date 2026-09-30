# ADR-0016 — Opt-in anonymous progress notes on the preview host

**Status:** Proposed; implemented locally on the owner's request

**Date:** 2026-09-30

**Deciders:** Owner (Arno) asked to see where players drop off; built by Claude Code

## Context

The owner shares a public preview and needs to know where players stop. The game is
local-first. `SECURITY.md` rules out transmission because a connection exists, third-party
analytics and device fingerprinting. ADR-0011 says silent telemetry breaks the
explicit-sharing boundary.

## Decision

Ask first, and send nothing unless the player says yes.

- The game asks only when its host answers `GET ./telemetry` with 204. Hosts that do not
  answer this way, such as GitHub Pages and the offline file, never ask and never send.
- The question uses plain bilingual language. It says what is sent and what is never
  sent. "No" gives the full game. Players can turn notes on or off under Records.
  Only the answer and a random note ID are saved on the phone.
- A note holds only: a random ID (created at "yes", removed at "no", not the record ID),
  the step (`open`, `guide`, `trade`, `event`, `review`, `panel`, `finished`, `closed`,
  `newRun`), the week, the run number, the event or panel name, the language and the
  content/calculation version.
- A note never holds money figures, plans, choices, "why" picks, names or device data.
- `scripts/preview-server.py` stores only whitelisted fields, adds UTC time to the minute,
  and writes to `$XDG_DATA_HOME/business-simulator/telemetry.jsonl`, outside the
  repository. It stores no IP address or headers.
- `scripts/telemetry-report.py` shows the funnel and the last note of each player who has
  not finished.
- Notes are fire-and-forget. A note made offline is lost.

## Consequences

- The funnel describes only players who say yes. It is not a count of all visitors.
- The notes are not the learner record. They must not be used for selection, scoring or
  any claim about a person.
- A played season is still not verified learning or execution.
- Deleting notes for one ID is a manual line filter on the file. Players cannot delete
  notes from the game.
