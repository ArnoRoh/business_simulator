#!/usr/bin/env python3
"""Build the shareable one-pager at docs/one-pager.html.

`docs/one-pager.md` is the source. This script renders it — nothing is authored
here, so the two cannot say different things. Stdlib only, in the spirit of
ADR-0006. Run:

    python3 scripts/build-one-pager.py

There is no PDF step because this environment has no browser or renderer. The
page carries a print stylesheet (A4, sensible margins, no page breaks inside a
table), so "Print → Save as PDF" produces the sendable version.

The numeric claims in the prose are checked against `scripts/lib/cea_model.py`
on every build. If someone changes a model parameter and forgets the note, this
fails rather than shipping a stale figure.
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "one-pager.md"
OUT = ROOT / "docs" / "one-pager.html"

sys.path.insert(0, str(ROOT / "scripts" / "lib"))


# ---------------------------------------------------------------------------
# Guard: the prose must agree with the model
# ---------------------------------------------------------------------------

def check_figures(md: str) -> list[str]:
    """Return a list of complaints; empty means the note matches the model."""
    from cea_model import model, v  # noqa: E402

    r = model()
    bad = []

    def want(needle: str, what: str) -> None:
        if needle not in md:
            bad.append(f"{what}: expected {needle!r} in the prose")

    want(f"{round(r['cost_per_finisher'])}", "cost per finisher")
    want(f"{r['cash_multiple']:.1f}×", "cash multiple")
    want(f"{v('grants')} grants of {v('grant_size'):,}".replace(",", ","),
         "grant count and size")
    want(f"{round(v('p_transform') * 100)}%", "transformational rate")
    return bad


# ---------------------------------------------------------------------------
# A very small Markdown subset — exactly what the source file uses
# ---------------------------------------------------------------------------

def inline(text: str) -> str:
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', out)
    return out


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def render(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    para: list[str] = []
    i = 0

    def flush() -> None:
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            flush()
        elif stripped == "---":
            flush()
            out.append("<hr>")
        elif stripped.startswith("#"):
            flush()
            level = len(stripped) - len(stripped.lstrip("#"))
            out.append(f"<h{level}>{inline(stripped[level:].strip())}</h{level}>")
        elif stripped.startswith("|"):
            flush()
            head = split_row(stripped)
            i += 1  # the |---|---| separator
            body = []
            while i + 1 < len(lines) and lines[i + 1].strip().startswith("|"):
                i += 1
                body.append(split_row(lines[i].strip()))
            cells = "".join(f"<th>{inline(c)}</th>" for c in head)
            rows = "".join(
                "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>"
                for row in body
            )
            out.append(f"<table><thead><tr>{cells}</tr></thead><tbody>{rows}</tbody></table>")
        elif stripped.startswith("- "):
            flush()
            items = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                items.append(lines[i].strip()[2:])
                i += 1
            i -= 1
            lis = "".join(f"<li>{inline(t)}</li>" for t in items)
            out.append(f"<ul>{lis}</ul>")
        else:
            para.append(stripped)
        i += 1

    flush()
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------

CSS = """
:root{color-scheme:light dark}
body{
  --surface-1:#fcfcfb; --page:#f9f9f7;
  --text-primary:#0b0b0b; --text-secondary:#3f3e3b; --muted:#898781;
  --border:rgba(11,11,11,.12); --accent:#2a78d6;
}
@media (prefers-color-scheme:dark){
  :root:where(:not([data-theme=light])) body{
    --surface-1:#1a1a19; --page:#0d0d0d;
    --text-primary:#fff; --text-secondary:#d2d1c8; --muted:#898781;
    --border:rgba(255,255,255,.12); --accent:#3987e5;
  }
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--page); color:var(--text-primary);
  font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;
}
main{max-width:820px;margin:0 auto;padding:44px 24px 72px}
h1{font-size:29px;line-height:1.2;margin:0 0 6px;letter-spacing:-.02em}
h2{font-size:16px;margin:26px 0 8px;letter-spacing:.02em;text-transform:uppercase;
   color:var(--accent);font-weight:600}
p{margin:0 0 11px;color:var(--text-secondary)}
li{color:var(--text-secondary);margin-bottom:4px}
strong{color:var(--text-primary);font-weight:600}
em{color:var(--text-primary)}
a{color:inherit;text-decoration:underline;text-decoration-color:var(--border)}
hr{border:0;border-top:1px solid var(--border);margin:18px 0 4px}
code{font-size:.9em;background:var(--surface-1);border:1px solid var(--border);
     border-radius:4px;padding:0 4px}
table{border-collapse:collapse;width:100%;font-size:13.5px;margin:12px 0 14px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);
      vertical-align:top;color:var(--text-secondary)}
th{color:var(--text-primary);font-weight:600;font-size:12px;
   text-transform:uppercase;letter-spacing:.03em}
tbody tr:last-child td{border-bottom:0}
td:first-child{white-space:nowrap}
.foot{margin-top:34px;padding-top:12px;border-top:1px solid var(--border);
      font-size:12px;color:var(--muted)}
@media print{
  @page{size:A4;margin:14mm}
  body{background:#fff;color:#000;font-size:10pt;line-height:1.42}
  main{max-width:none;padding:0}
  h1{font-size:19pt}
  h2{font-size:10pt;margin:14pt 0 5pt;color:#000;
     border-bottom:.5pt solid #bbb;padding-bottom:2pt}
  p,li{color:#1a1a1a}
  table{font-size:8.5pt;page-break-inside:avoid}
  th,td{padding:4pt 6pt;border-bottom:.5pt solid #ccc}
  a{text-decoration:none}
  .foot{color:#555}
}
"""


def build() -> None:
    md = SRC.read_text(encoding="utf-8")

    complaints = check_figures(md)
    if complaints:
        for c in complaints:
            print(f"  stale: {c}", file=sys.stderr)
        raise SystemExit(
            "docs/one-pager.md disagrees with scripts/lib/cea_model.py. "
            "Fix the prose (or the model) rather than this script."
        )

    # The title line becomes <title>; the italic strapline under it is dropped
    # from the shareable version — it points at a file the reader will not have.
    body = md.split("\n")
    title = body[0].lstrip("# ").strip()
    rest = "\n".join(body[1:])
    rest = re.sub(r"^\*One-page concept note.*?\*\n", "", rest,
                  count=1, flags=re.S | re.M)

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="A staged funnel for finding and funding export
 entrepreneurs who would otherwise be missed.">
<style>{CSS}</style>
</head>
<body>
<main>
<h1>{html.escape(title)}</h1>
{render(rest)}
<p class="foot">Business Simulator &middot; concept summary. Figures marked as
modelled come from a published cost-effectiveness model and are assumptions, not
results. The long version, with the model and its sensitivity analysis, is
available on request.</p>
</main>
</body>
</html>
"""
    OUT.write_text(page, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(page):,} bytes)")


if __name__ == "__main__":
    build()
