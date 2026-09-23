# The app

The main page runs one continuous mandazi business. English and Kiswahili are available
throughout. Standing plans carry across a candidate 24-week season. Customers, stock,
cash, profit, debt and owner time change with your decisions. Monthly reviews preserve
context. The scene uses native SVG and CSS; motion is optional and skippable.

Earlier games remain at `intro.html` and `practice.html`, with their original records.
The new game is not connected to the separate programme portal. Sample figures,
Kiswahili and physical-device performance need local review.

## Run it

```bash
cd app
python3 -m http.server 8000
```

Open `http://localhost:8000`. Offline installation requires a secure browser context:
localhost for development or HTTPS on a phone. A plain LAN HTTP address can show the
interface but does not verify service-worker support.

## Standalone distribution

Open `season-standalone.html` directly or share the file. It contains the new game
and needs no content download. `standalone.html` retains the four chapters. Edit source files and regenerate it with:

```bash
node scripts/build-single-file.mjs
node scripts/build-single-file.mjs --entry
node scripts/build-single-file.mjs --season
```

`intro-standalone.html` is the smaller, self-contained introduction. Its link to
the full game needs a connection. Introduction progress is one active attempt per
browser; download it before replacing it. The full game retains separate attempts
and learner profiles. Old prototype saves remain untouched.

The served PWA caches the complete new game core, about 47 KB compressed. Earlier
games and chapters download when used. Previously downloaded chapters survive updates. Compressed artifact budgets are 150 KiB for
the shell plus first chapter and 60 KiB per additional chapter. `smoke-app.mjs` checks
these budgets. Actual transfer depends on hosting compression and browser caching.

## State and privacy

The new season uses IndexedDB `mv-bs-season`, separate from all earlier stores. Each
save contains its action log and result, a revision, sample rules and bilingual content.
Several attempts can remain on the phone. Failed or conflicting writes are visible.
Download a partial or complete JSON record at any point. There is no background upload,
record import or new-game account service. The local run number does not verify identity
or independent play. See [ADR-0015](../docs/adr/0015-season-records-and-preserved-games.md).

The following record details apply to the preserved chapter game.

The game has no runtime dependency. The separate [programme portal](../docs/MV-BS-RUN-001-programme-portal.md) uses a Node service with native SQLite. IndexedDB holds separate local
profiles and attempts, including drafts, results, recovery positions and scenario
snapshots. Replaying archives the previous attempt. The Learners screen lists previous
attempts and provides local backup and explicit deletion. Profiles have no access lock.
A local profile is not verified identity.

My record is available during play. A learner can share, download or print it. These
are deliberate local actions; no background upload or analytics exists. Original legacy
saves are retained during migration. An unsupported save must remain recoverable.

## Verification

```bash
npm ci
npx playwright install --with-deps chromium
npm test
python3 scripts/check-generated.py
```

Playwright is for development only. The browser tests use a temporary loopback server
and synthetic records. They exercise full playthroughs, actual IndexedDB, reloads,
chapter changes, printing, offline use, updates, focus and narrow layouts. Engine and
content checks verify cash reconciliation across seeded paths.

These checks do not establish readiness on a physical low-end Android phone, native
Kiswahili quality, local commercial accuracy or real learner comprehension. Use the
[learner acceptance protocol](../docs/MV-BS-TEST-001-learner-acceptance.md) for those checks.
