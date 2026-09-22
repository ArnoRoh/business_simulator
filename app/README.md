# The app

Start with thirteen untimed steps in Asha’s five-day introduction. English and
Kiswahili work throughout. Cash, stock, customer debts and repayments follow your
choices. The introduction is practice; it does not qualify anyone for a grant.

Open `practice.html` at any time for existing records and the deeper game:

Four unlocked business chapters in English and Kiswahili. Each has twenty decisions in
four short missions. Tap an action or price, watch its result and read a short takeaway.
Normal play asks for no profit estimate. Each chapter ends with a story transition. The figures and translation remain unverified by local reviewers.
See [game design](../docs/game-design.md) for current behaviour and its limits.

## Run it

```bash
cd app
python3 -m http.server 8000
```

Open `http://localhost:8000`. Offline installation requires a secure browser context:
localhost for development or HTTPS on a phone. A plain LAN HTTP address can show the
interface but does not verify service-worker support.

## Standalone distribution

Open `standalone.html` directly or share the file. It embeds every chapter and needs no
content download. Edit source files and regenerate it with:

```bash
node scripts/build-single-file.mjs
node scripts/build-single-file.mjs --entry
```

`intro-standalone.html` is the smaller, self-contained introduction. Its link to
the full game needs a connection. Introduction progress is one active attempt per
browser; download it before replacing it. The full game retains separate attempts
and learner profiles. Old prototype saves remain untouched.

The served PWA downloads chapters on demand. Compressed artifact budgets are 150 KiB for
the shell plus first chapter and 60 KiB per additional chapter. `smoke-app.mjs` checks
these budgets. Actual transfer depends on hosting compression and browser caching.

## State and privacy

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
