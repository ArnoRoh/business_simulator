#!/usr/bin/env bash
#
# Backup memory/ — the least replaceable thing in this project.
#
# memory/ is gitignored and lives only on this machine (AGENTS.md section 5): no
# remote copy, no version history. The mirror directory mentioned in PROJECT_STATE.md
# is a snapshot, not a backup. This script produces timestamped, encrypted archives
# so that a dead disk or a bad rm costs a day, not the whole working log.
#
# Usage:
#   scripts/backup-memory.sh
#
# Configuration (environment variables):
#   MEMORY_BACKUP_DIR         destination   (default ~/backups/business-simulator-memory)
#   MEMORY_BACKUP_KEEP        how many archives to keep (default 30)
#   MEMORY_BACKUP_PASSPHRASE  passphrase; if unset, MEMORY_BACKUP_PASSPHRASE_FILE is read;
#                             if both unset, gpg will prompt
#
# The archive is verified by extracting it to a temporary directory and diffing the
# result against memory/ before the script reports success — a backup that cannot be
# restored is a wish, not a backup, and listing an archive's table of contents does not
# prove its members are intact.
#
# Suggested cron (once a day at 07:20, when the machine is usually on). Note the repo
# path is absolute and not under $HOME — an earlier version of this comment had
# $HOME/srv/... , which pasted into crontab and silently never ran:
#   20 7 * * * MEMORY_BACKUP_PASSPHRASE_FILE=$HOME/.config/business-simulator/memory-backup-passphrase /srv/repos/business_simulator/scripts/backup-memory.sh >> $HOME/.cache/business-simulator-backup.log 2>&1

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO/memory"
DEST="${MEMORY_BACKUP_DIR:-$HOME/backups/business-simulator-memory}"
KEEP="${MEMORY_BACKUP_KEEP:-30}"

if [ ! -d "$SRC" ]; then
  echo "FAIL: $SRC does not exist — nothing to back up." >&2
  exit 1
fi

mkdir -p "$DEST"

STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$DEST/memory-$STAMP.tar.gz.gpg"

GPG_ARGS=(--batch --yes --cipher-algo AES256)
if [ -n "${MEMORY_BACKUP_PASSPHRASE:-}" ]; then
  GPG_ARGS+=(--pinentry-mode loopback --passphrase "$MEMORY_BACKUP_PASSPHRASE")
elif [ -n "${MEMORY_BACKUP_PASSPHRASE_FILE:-}" ]; then
  GPG_ARGS+=(--pinentry-mode loopback --passphrase-file "$MEMORY_BACKUP_PASSPHRASE_FILE")
fi

tar -C "$REPO" -czf - memory | gpg "${GPG_ARGS[@]}" --output "$ARCHIVE" --symmetric

# Verify by actually restoring: decrypt, extract to a temporary directory, and diff the
# result against the source. Listing the table of contents (tar -t) proves only that the
# header is readable — it will happily pass a truncated or corrupted member. Fails here
# rather than at restore time, which is the only time it would otherwise be discovered.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! gpg "${GPG_ARGS[@]}" --decrypt "$ARCHIVE" 2>/dev/null | tar -C "$TMP" -xzf -; then
  echo "FAIL: $ARCHIVE could not be decrypted and extracted — removing it." >&2
  rm -f "$ARCHIVE"
  exit 1
fi

# diff -r compares every file's contents, not just the names. --no-dereference so a
# symlink is compared as a symlink rather than followed out of the tree.
if ! diff -r --no-dereference "$SRC" "$TMP/memory" >/dev/null; then
  echo "FAIL: restored copy of $ARCHIVE differs from $SRC — removing it." >&2
  diff -r --no-dereference "$SRC" "$TMP/memory" | head -20 >&2
  rm -f "$ARCHIVE"
  exit 1
fi

echo "ok  $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Prune: keep the newest $KEEP verified archives.
ls -1t "$DEST"/memory-*.tar.gz.gpg 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "pruned $old"
done
