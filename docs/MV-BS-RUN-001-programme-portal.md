# MV-BS-RUN-001 — Run the programme portal

**Status:** Local implementation. No participant deployment. **Date:** 2026-09-12.

## Start a local test

Use Node 22.13 or newer. Run from the repository root:

```sh
npm run portal
```

Open `http://127.0.0.1:8787/` for the game and `/portal/` for the portal.
Complete all four chapters, then select the programme link. You can also import the
four exported chapter records. Use made-up details in test mode. The sample grant is
1,000 USD. These are test settings, not an approved programme offer.

The service uses Node's built-in HTTP and SQLite modules. It adds no runtime package.
The static GitHub Pages site cannot run this service. Opening the standalone HTML file
also cannot run the portal. Keep the game and portal on one origin for local record access.

## Configure the programme

Set environment variables in the service runner. Do not commit keys or participant data.
Settings apply to new applications; existing applications keep their programme snapshot.
If the named AI recipient changes, the service stops grading older applications rather
than sending them to the new recipient. A consent migration needs a separate change.

| Variable | Purpose / default |
| --- | --- |
| `PORTAL_HOST`, `PORTAL_PORT` | Listen address; `127.0.0.1`, `8787` |
| `PORTAL_DB` | Database path; `learner-data/portal.sqlite` |
| `PORTAL_ADMIN_TOKEN` | Private reviewer key; unset disables reviewer access |
| `PORTAL_CURRENCY` | Three-letter currency code; sample `USD` |
| `PORTAL_GRANT_AMOUNT` | Fixed grant budget; sample `1000` |
| `PORTAL_RECIPIENT` | Organisation receiving the data |
| `PORTAL_CONTACT` | Programme contact for questions, recovery and deletion |
| `PORTAL_RETENTION_DAYS` | Time from application creation to removal; sample `365` |
| `PORTAL_ORIGIN` | Exact HTTPS origin used by the participant site |
| `PORTAL_LIVE` | Set `1` only for an authorised participant deployment |
| `PORTAL_AI_RECIPIENT` | Assessment provider name shown before sharing |
| `PORTAL_AI_URL` | Full HTTPS chat-completions endpoint |
| `PORTAL_AI_MODEL` | Model identifier accepted by that endpoint |
| `PORTAL_AI_KEY` | Server-side provider credential |

Generate a reviewer key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Keep it private. Open `/portal/?review` and enter the key. It is held in page memory.
The service creates a private `.key` file beside its database. Preserve this file when
moving or restoring the service. It is needed for stable entry and return credentials.

Before collecting real records, the operator must establish the recipient, provider data
terms, contact, hosting, retention and recovery procedure. Configure HTTPS at a reverse
proxy and keep Node on loopback or a private interface. No deployment is included here.
The application has one reviewer role; it does not provide staff accounts or role separation.
The API limit is 100 requests per minute per source IP. A reverse proxy or shared mobile
network can put many participants in one bucket. Load-test and set an appropriate limit
before a larger pilot; do not trust arbitrary forwarded IP headers.

## Configure and check grading

The adapter accepts a chat-completions API with JSON output and image input when a photo
is attached. It sends the answers, financial checks and relevant earlier answers. Initial
application grading excludes the game record and contact field. Later practical questions
include one submitted game decision. Contact details in free text or photos cannot be
removed reliably; ask participants to exclude them.

The configured model must return scores from 0 to 3, bilingual reasons and exact evidence
quotes. The service rejects invalid output and stores each attempt. Jobs have a durable
lease and retry three times. Without a provider, submissions remain pending. A failed
provider does not produce a substitute score. Reviewers can request another grading run.

The current rubric is `portal-1` in `portal/assessment.mjs`. Test a proposed provider
against reviewed synthetic examples before participant use. A passing API integration is
not evidence that the model gives sound assessments or predicts business performance.

## Participant and reviewer operation

A participant shares four selected chapter records with consent. The server checks their
structure and versions, then issues an entry code valid for 30 days. Redemption produces
a separate private return key. This is account access, not verified identity or proof of
unaided play. The service rejects unsupported scenario versions; retain compatible server
content when admitting older records, or review a version migration before upgrading it.

Drafts save in the browser. Sending creates a durable local queue. A connection retry uses
the same request so it cannot create another submission. Online draft saving is explicit.
Download a backup before signing out on a shared phone. Restore it from the entry screen
while connected. Keep the backup private: it contains the return key and saved answers.
After a reviewer rotates a lost key, an older backup key no longer opens the account.

Reviewers record the date on which the grant was available to the participant. This only
records a receipt; it does not transfer money. Reports open two, four and six calendar
months later. The original forecast and earlier report versions stay available. A
correction adds a version with a reason. The final report includes reflection, the current
constraint and the proposed use of a later grant.

The AI can raise an integrity concern. A reviewer must cite stored evidence to confirm an
affected criterion's zero score. The participant can appeal. Reversal restores credit;
the original grade and all findings remain. The rubric excludes spelling, education,
typing, paste events and permitted translation or dictation from authorship judgments.
A final readiness indication is advisory. A reviewer records progression, hold or rejection
with a reason. The service does not award money automatically.

## Data and backups

API responses use `no-store`. The portal worker caches public assets only. Local drafts,
return keys and received assessments stay in IndexedDB until sign-out or deletion.
Do not share a browser session or a downloaded backup with another participant.

Use an encrypted, access-controlled backup location outside the repository. For the
simplest consistent backup, stop the service cleanly and copy the full database directory,
including `.key`, `-wal` and `-shm` files if present. Restart and check the portal. Restore
into an isolated directory and verify a synthetic account before relying on the procedure.
Do not copy only the main SQLite file while the service is writing.

Deletion removes the application and related rows. The running service also removes
expired unredeemed codes and records past the stored retention period. Deleted bytes can
remain in SQLite journal files and old backups; database deletion is not secure erasure.
Apply the programme's deletion and retention schedule to backups separately.

## Checks

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:portal
```

For API checks alone: `node scripts/test-portal.mjs --no-browser`.
The test uses a temporary database, synthetic records and a loopback mock grader.
It does not contact a paid AI provider. The browser check covers guided steps, both
languages, offline resume and submission, and private-cache separation.
See [learner acceptance](./MV-BS-TEST-001-learner-acceptance.md) for field checks.
Kiswahili review, low-end physical phones and learner acceptance remain required.
