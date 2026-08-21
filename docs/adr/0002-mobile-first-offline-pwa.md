# ADR-0002 — Deliver as a mobile-first, offline-capable PWA

**Status:** Accepted
**Date:** 2026-08-02
**Deciders:** Project owner
**Related:** [D-002](../../memory/DECISIONS.md), [`../localization.md`](../localization.md)

## Context

The learners this is built for, starting in Tanzania, share a set of conditions that are
not negotiable and not typical of the environments most software is designed in:

- **Devices** are Android, several years old, often around 2GB RAM, with small screens.
  Sometimes shared between people.
- **Connectivity** is intermittent. It is normal to have no connection for hours, and to
  have a weak one the rest of the time.
- **Data is paid for by the learner**, per megabyte, out of money that has other uses.
  Every download is a cost they bear.
- **Distribution runs through partner organisations** — training providers, BDS
  organisations, grant programmes — not through consumer app-store discovery.
- **Sessions are interrupted.** Play happens in fragments, between other obligations,
  and the app will be killed mid-decision.

Anything that assumes a connection, a modern device, or uninterrupted attention will
fail in the field regardless of how well it works in a demo.

## Decision

We will deliver the simulator as a **mobile-first Progressive Web App**: installable to
the home screen, fully functional offline after first load, with an aggressively small
data footprint and continuous state persistence.

The design centre is a low-end Android phone on a metered connection, not a desktop
browser.

## Consequences

**What this gets us.** A single codebase reaching any device with a browser. No app
store, so partner organisations can distribute by sharing a link — which matters when
deployment happens through a training session rather than a marketing funnel. Updates
reach everyone without requiring a download decision from the learner. Offline operation
is a first-class capability rather than a degraded mode.

**What this costs us.** Offline-first is harder than it looks: state persistence,
conflict handling on sync, cache invalidation and service-worker lifecycle are all real
engineering, and getting them wrong produces bugs that only appear in the field. We must
hold a data budget under continuous pressure — every feature will want assets. PWA
install flows on Android are inconsistent across browsers and confusing to
non-app-fluent users, which is a genuine risk for the Joseph persona.

**What it forecloses.** Deep device integration — background sync beyond what the
platform allows, reliable push notification, hardware access. If the product later needs
multi-week engagement with reminders ([Q-004](../../memory/OPEN_QUESTIONS.md)), the
notification limitation may bite.

## Alternatives considered

**Native Android application.** Better offline story, proper background work, reliable
notifications, and a familiar install experience through the Play Store. Rejected on
distribution and iteration cost: Play Store distribution adds friction for programme-led
deployment, updates depend on the learner choosing to download them over paid data, and
it excludes non-Android users entirely. Store review also slows iteration during a phase
when we expect to be wrong about a lot.

**Server-rendered web application with no offline support.** Much simpler to build and
operate. Rejected outright — it fails the core connectivity constraint. A tool that
stops working when the connection drops will be abandoned in the first session.

**PWA plus a facilitator-led in-person mode as a launch requirement.** Attractive:
Daniel's persona is real, group training is how partner organisations actually work, and
it addresses the digital-fluency fairness problem directly. **Not rejected — deferred.**
It is an addition to this decision rather than an alternative, and committing to it
before the core loop exists would spread thin effort across two delivery models.

**Feature-phone / USSD / SMS delivery.** Reaches the widest possible population. Rejected
because the simulation depends on showing consequence and state in a way that a text
channel cannot carry, and the behavioural record would be far thinner.

## Revisit if

- Pilot partners report the PWA install flow is a real barrier for their participants,
  particularly for less app-fluent users.
- A resolved [Q-004](../../memory/OPEN_QUESTIONS.md) establishes multi-week engagement as
  a requirement and reliable notification proves impossible within PWA constraints.
- Data-budget targets prove unachievable while delivering usable content.
