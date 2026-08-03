# Session 004 — Shareable single-file build

**Date:** 2026-08-02
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code)
**Branch:** `main`
**Duration / scope:** Small. Tooling and distribution only — no change to the simulation.

---

## Goal

The owner asked for a temporary online version they could open without checking the
repository out, and for the work to be pushed.

## What happened

Added `scripts/build-single-file.mjs`, which inlines the CSS, JavaScript and scenario
content into one self-contained `app/standalone.html`. Published it as a private hosted
page:

**https://claude.ai/code/artifact/e5559f61-a553-4780-9d6f-992d158c61b5**

No change to the simulation, the engine, the content or the assessment model. This is
distribution only.

The design was deliberately **not** revisited. `app/css/styles.css` already carries a
considered token system with both themes, verified in a browser at 360px, so the port
preserves it exactly rather than restyling.

## Two bugs the browser caught

Both would have shipped if the file had only been reviewed by reading it.

**A dangling `catch`.** The build replaces the scenario `fetch` with the embedded
constant. The first regex matched only as far as the end of the `try` block, orphaning
the original `catch` — the whole script failed to parse and the page rendered empty. The
build now asserts the block was matched and throws if `main.js` changes shape.

**Lost viewport meta.** A host page supplies its own `<head>`, so the `viewport` tag from
`index.html` disappeared. A phone would have laid out at ~980px and scaled down,
defeating the mobile-first design entirely. The build now injects the tag if absent.

## Decisions made

None requiring a log entry. One judgement worth recording: `standalone.html` is a
**generated file that is nonetheless committed**, for convenience in sharing. That
accepts a drift risk — it can fall behind `app/` — mitigated only by a warning in
`app/README.md`. If it drifts in practice, gitignore it and rebuild on demand instead.

## Questions raised or resolved

None.

## State at end of session

Unchanged from session 003, plus the build script, the generated file and a published
link. All checks still green: 47 engine assertions, 48/48 scenario predictions, links
resolving.

## Next steps

Unchanged — the owner playing it remains the point (Q-011), and **Q-012** (performance
gate or completion gate) is still the most consequential open question.

## Notes for the next contributor

- Rebuild `standalone.html` after any change to `app/`, or the shared link goes stale.
- Republishing the same file path updates the existing link rather than minting a new
  one.
