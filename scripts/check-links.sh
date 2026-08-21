#!/usr/bin/env bash
#
# Check that relative Markdown links resolve to files that exist.
#
# Deliberately self-contained: no npm, no external actions, no network. This project
# has no toolchain yet (memory/DECISIONS.md, D-001) and adding one just to check links
# would be premature.
#
# Skips external links (http/https/mailto) and pure anchors (#section).
#
# `memory/` is not published (see .gitignore). Links into it are checked when the
# directory is present — which it is on the machine the work happens on — and reported
# as skipped when it is not, so CI on the public repository stays green without
# pretending the links were verified.
#
# Usage: bash scripts/check-links.sh

set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail=0
checked=0
skipped=0

# Is the private memory tree present on this machine?
if [ -d "${repo_root}/memory" ]; then
  memory_present=1
else
  memory_present=0
fi

# Collect Markdown files, excluding anything vendored or ignored.
while IFS= read -r file; do
  dir="$(dirname "$file")"

  # Extract link targets from [text](target). Handles nested parens poorly, which is
  # fine — we don't use them.
  while IFS= read -r target; do
    [ -z "$target" ] && continue

    # Skip external schemes and pure anchors.
    case "$target" in
      http://*|https://*|mailto:*|tel:*|\#*) continue ;;
    esac

    # Strip any anchor fragment; we check the file, not the heading.
    path="${target%%#*}"
    [ -z "$path" ] && continue

    # Resolve relative to the containing file, or to repo root if absolute-style.
    case "$path" in
      /*) resolved="${repo_root}${path}" ;;
      *)  resolved="${dir}/${path}" ;;
    esac

    # Links into the unpublished memory tree, on a checkout that does not have it.
    if [ "$memory_present" -eq 0 ] && case "$path" in *memory/*) true ;; *) false ;; esac; then
      skipped=$((skipped + 1))
      continue
    fi

    checked=$((checked + 1))

    if [ ! -e "$resolved" ]; then
      echo "::error file=${file}::Broken link: ${target}"
      echo "  in ${file}  ->  ${path}"
      fail=1
    fi
  done < <(grep -oE '\]\([^)]+\)' "$file" 2>/dev/null | sed -E 's/^\]\(//; s/\)$//' | sed -E 's/[[:space:]]+"[^"]*"$//')

done < <(find . -name '*.md' -type f \
           -not -path './node_modules/*' \
           -not -path './.git/*' \
           -not -path './dist/*')

echo "Checked ${checked} relative link(s)."
if [ "$skipped" -gt 0 ]; then
  echo "Skipped ${skipped} link(s) into memory/, which is not published on this checkout."
fi

if [ "$fail" -ne 0 ]; then
  echo "Broken internal links found."
  exit 1
fi

echo "All relative links resolve."
