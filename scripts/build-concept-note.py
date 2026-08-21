#!/usr/bin/env python3
"""Build the concept note at docs/concept-note.html.

Stdlib only, in the spirit of ADR-0006 (no build step, no dependencies). Run:

    python3 scripts/build-concept-note.py

The arithmetic lives in `scripts/lib/cea_model.py` and is shared with the spreadsheet
builder. Nothing numeric is typed into the HTML by hand, so the note cannot drift from
the model or from the workbook. Change a parameter in the model and re-run both.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

from cea_model import (  # noqa: E402
    PARAMS, RANGES, P, annuity, breakeven_p, derivation, esc, model, num, pct,
    pv_stream, scenarios, tornado, usd, v, write_csv,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "concept-note.html"

# ---------------------------------------------------------------------------
# SVG helpers
# ---------------------------------------------------------------------------
# Colors are referenced as CSS custom properties so light/dark swap in one place.
# Palette: dataviz reference instance, validated in both modes (see build notes).

S1, S2, S3 = "var(--series-1)", "var(--series-2)", "var(--series-3)"
INK, INK2, MUTED = "var(--text-primary)", "var(--text-secondary)", "var(--muted)"
GRID, AXIS = "var(--gridline)", "var(--baseline)"
SURFACE = "var(--surface-1)"


def svg_open(w: int, h: int, title: str, desc: str = "") -> list[str]:
    return [
        f'<svg viewBox="0 0 {w} {h}" width="100%" role="img" '
        f'aria-label="{esc(title)}" class="chart">',
        f"<title>{esc(title)}</title>",
        f"<desc>{esc(desc or title)}</desc>",
    ]


def text(x, y, s, *, size=13, fill=INK2, anchor="start", weight=400, tabular=False):
    extra = ' style="font-variant-numeric:tabular-nums"' if tabular else ""
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" '
            f'text-anchor="{anchor}" font-weight="{weight}"{extra}>{esc(s)}</text>')


# --- diagram primitives ----------------------------------------------------

def box(x, y, w, h, *, fill=SURFACE, stroke=AXIS, rx=6, dash=None, width=1.5):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{width}"{d}/>')


def arrow(x1, y1, x2, y2, *, stroke=AXIS, width=2, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" '
            f'stroke-width="{width}" marker-end="url(#arrowhead)"{d}/>')


def defs() -> str:
    return (
        '<defs>'
        '<marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" '
        'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 0 L 10 5 L 0 10 z" fill="{AXIS}"/></marker>'
        '</defs>'
    )


# ---------------------------------------------------------------------------
# Diagram 1 — the intervention
# ---------------------------------------------------------------------------

def chart_funnel(m: dict) -> str:
    W, H = 900, 760
    o = svg_open(W, H, "The intervention, stage by stage",
                 "A vertical funnel from recruitment to commercial credit, with a side "
                 "branch at each stage showing what non-progressors receive.")
    o.append(defs())

    mainx, mainw = 40, 470
    sidex, sidew = 570, 290

    stages = [
        # (y, height, title, lines, side title, side lines, accent)
        (52, 62, "Recruitment", [f"{num(m['starts'])} people reached · channel not yet chosen (Q-039)"],
         None, None, MUTED),
        (146, 88, "Stage 0 — the simulator",
         ["Four chapters, offline, no account, no backend",
          f"Cost per player ≈ {usd(v('recruit_per_start'), 2)} · content already built"],
         f"{num(m['starts'] - m['finishers'])} do not finish",
         ["Keep whatever they learned", "No record leaves the phone"], S1),
        (266, 88, "Stage 1 — the forecast",
         [f"{num(m['finishers'])} finish → {num(m['applicants'])} submit through the portal",
          "AI-judged, blind to the stage-0 record"],
         f"{num(m['applicants'] - m['funded'])} not funded",
         ["Keep a portable record", "Comparison group (Q-034)",
          "Re-enter the next cohort"], S2),
        (386, 88, f"{num(m['funded'])} grants × {usd(v('grant_size'))}",
         [f"Unrestricted cash · selection ratio {pct(m['selection_ratio'], 0)}",
          "Monthly photos · forecast on record"],
         "Six months", ["Forecast vs actual", "Explain the gap"], S3),
        (506, 78, f"Stage 2 — {num(v('grants') * v('stage2_share'))} firms × {usd(v('stage2_tranche'))}",
         ["Fixed tranche, unrestricted",
          "Back-office support offered, never required (Q-038)"], None, None, S1),
        (612, 78, f"Stage 3 — {num(v('grants') * v('stage2_share') * v('stage3_share'))} firms × {usd(v('stage3_tranche'))}",
         ["Balance sheet large enough to carry debt"], None, None, S1),
    ]

    for y, h, title, lines, stitle, slines, accent in stages:
        o.append(box(mainx, y, mainw, h))
        o.append(f'<rect x="{mainx}" y="{y}" width="4" height="{h}" rx="2" fill="{accent}"/>')
        o.append(text(mainx + 18, y + 24, title, size=15, fill=INK, weight=600))
        for i, ln in enumerate(lines):
            o.append(text(mainx + 18, y + 45 + i * 19, ln, size=12.5, fill=INK2))
        if stitle:
            sh = 30 + len(slines) * 18
            sy = y + (h - sh) / 2
            o.append(box(sidex, sy, sidew, sh, dash="4 4", width=1.2))
            o.append(text(sidex + 14, sy + 20, stitle, size=12.5, fill=INK, weight=600))
            for i, ln in enumerate(slines):
                o.append(text(sidex + 14, sy + 38 + i * 17, "· " + ln, size=11.5, fill=MUTED))
            o.append(arrow(mainx + mainw + 6, y + h / 2, sidex - 8, sy + sh / 2, dash="3 3", width=1.5))

    for i in range(len(stages) - 1):
        y0 = stages[i][0] + stages[i][1]
        y1 = stages[i + 1][0]
        o.append(arrow(mainx + mainw / 2, y0 + 2, mainx + mainw / 2, y1 - 6))

    ey = 712
    o.append(box(mainx, ey, mainw, 40, stroke=S3, width=2))
    o.append(text(mainx + 18, ey + 25, "Exit — bankable. Commercial credit takes over.",
                  size=14, fill=INK, weight=600))
    o.append(arrow(mainx + mainw / 2, stages[-1][0] + stages[-1][1] + 2, mainx + mainw / 2, ey - 6))
    o.append("</svg>")
    return "\n".join(o)


# ---------------------------------------------------------------------------
# Diagram 2 — one instrument, three stages
# ---------------------------------------------------------------------------

def chart_loop() -> str:
    W, H = 900, 400
    o = svg_open(W, H, "The same mechanic at all three stages",
                 "Predict, reveal, diagnose — trained in the simulator, performed on the "
                 "real firm, and fed back into validating the filter.")
    o.append(defs())

    cards = [
        (30, "Stage 0 — simulated", S1,
         ["Predict a number", "See what happened", "Diagnose the cause"],
         "80 turns of practice"),
        (325, "Stage 1 — the forecast", S2,
         ["Dated, specific claims", "About their own firm", "Held on record"],
         "The plan is a prediction"),
        (620, "Stage 2 — the reveal", S3,
         ["Actual vs forecast", "Photos corroborate", "Explain the gap"],
         "Selection for the next tranche"),
    ]
    cy, ch, cw = 70, 150, 250
    for x, title, accent, lines, foot in cards:
        o.append(box(x, cy, cw, ch))
        o.append(f'<rect x="{x}" y="{cy}" width="{cw}" height="4" rx="2" fill="{accent}"/>')
        o.append(text(x + 16, cy + 30, title, size=14, fill=INK, weight=600))
        for i, ln in enumerate(lines):
            o.append(text(x + 16, cy + 54 + i * 20, "· " + ln, size=12.5, fill=INK2))
        o.append(text(x + 16, cy + ch - 14, foot, size=11.5, fill=MUTED))

    o.append(arrow(285, cy + ch / 2, 320, cy + ch / 2))
    o.append(arrow(580, cy + ch / 2, 615, cy + ch / 2))

    o.append(text(30, 40, "Trains the act it later measures", size=15, fill=INK, weight=600))

    vy = 270
    o.append(box(30, vy, 840, 96, dash="5 4", width=1.5))
    o.append(text(50, vy + 26, "The validation loop — the pilot's real output",
                  size=14, fill=INK, weight=600))
    o.append(text(50, vy + 50,
                  "Stage-0 behaviour → who was funded → what actually happened at six months.",
                  size=12.5, fill=INK2))
    o.append(text(50, vy + 70,
                  "Only answerable if some grants are randomised across the ranking (Q-034), "
                  "the judge scores blind,", size=12.5, fill=INK2))
    o.append(text(50, vy + 88, "and raw submissions are stored. None can be added afterwards.",
                  size=12.5, fill=INK2))
    o.append(arrow(745, cy + ch + 6, 745, vy - 6, dash="3 3"))
    o.append("</svg>")
    return "\n".join(o)


# ---------------------------------------------------------------------------
# Bar charts
# ---------------------------------------------------------------------------

def hbar(rows: list[tuple[str, float, str]], *, title: str, unit: str = "$",
         width: int = 860, rowh: int = 38, labelw: int = 250) -> str:
    def show(x: float) -> str:
        return usd(x) if unit == "$" else (f"{x:.2f}×" if unit == "x" else num(x, 1))

    """Horizontal bars, one series, direct-labelled. rows = (label, value, color)."""
    H = 30 + len(rows) * rowh + 14
    o = svg_open(width, H, title)
    maxv = max(r[1] for r in rows) or 1
    plotw = width - labelw - 130
    for i, (label, val, color) in enumerate(rows):
        y = 24 + i * rowh
        bw = max(plotw * (val / maxv), 2)
        o.append(text(labelw - 12, y + 17, label, size=12.5, fill=INK2, anchor="end"))
        # 4px rounded data-end, anchored to the baseline
        o.append(f'<rect x="{labelw}" y="{y}" width="{bw}" height="22" rx="4" fill="{color}">'
                 f"<title>{esc(label)}: {show(val)}</title></rect>")
        o.append(text(labelw + bw + 10, y + 17, show(val),
                      size=12.5, fill=INK, weight=600, tabular=True))
    o.append(f'<line x1="{labelw}" y1="18" x2="{labelw}" y2="{H - 8}" '
             f'stroke="{AXIS}" stroke-width="1"/>')
    o.append("</svg>")
    return "\n".join(o)


def chart_tornado(rows) -> str:
    base = model()["ratio"]
    W, labelw, rowh = 860, 250, 34
    H = 56 + len(rows) * rowh
    o = svg_open(W, H, "What the answer actually depends on",
                 "Benefit-cost ratio when each parameter is moved across its plausible "
                 "range, sorted by how much it swings the result.")
    lo_all = min(min(r[1], r[2]) for r in rows)
    hi_all = max(max(r[1], r[2]) for r in rows)
    span = max(hi_all - lo_all, 0.01)
    plotw = W - labelw - 90

    def px(val):
        return labelw + plotw * (val - lo_all) / span

    o.append(f'<line x1="{px(base)}" y1="30" x2="{px(base)}" y2="{H - 22}" '
             f'stroke="{AXIS}" stroke-width="1.5" stroke-dasharray="4 3"/>')
    o.append(text(px(base), 22, f"base {base:.2f}", size=11.5, fill=MUTED, anchor="middle"))

    for i, (key, r_lo, r_hi, swing) in enumerate(rows):
        y = 40 + i * rowh
        lo, hi = min(r_lo, r_hi), max(r_lo, r_hi)
        x0, x1 = px(lo), px(hi)
        o.append(text(labelw - 12, y + 15, PARAMS[key].label[:38], size=12, fill=INK2, anchor="end"))
        # low arm in red, high arm in blue, 2px surface gap at the base line
        o.append(f'<rect x="{x0}" y="{y}" width="{max(px(base) - x0 - 1, 0)}" height="20" rx="4" '
                 f'fill="var(--pole-low)"><title>{esc(PARAMS[key].label)} low → ratio {lo:.2f}</title></rect>')
        o.append(f'<rect x="{px(base) + 1}" y="{y}" width="{max(x1 - px(base) - 1, 0)}" height="20" rx="4" '
                 f'fill="var(--pole-high)"><title>{esc(PARAMS[key].label)} high → ratio {hi:.2f}</title></rect>')
        o.append(text(x1 + 8, y + 15, f"{lo:.2f}–{hi:.2f}", size=11.5, fill=MUTED, tabular=True))
    o.append("</svg>")
    return "\n".join(o)


def chart_breakeven() -> str:
    """One curve, two reference lines: the cash benchmark and GiveWell's funding bar."""
    W, H = 860, 400
    pad_l, pad_r, pad_t, pad_b = 70, 30, 34, 74
    o = svg_open(W, H, "Cost-effectiveness against the transformational hit rate",
                 "Benefit-cost ratio rising with the share of funded firms that become "
                 "transformational, against the unconditional-cash benchmark and "
                 "GiveWell's stated funding bar.")
    xmax = 0.50
    base = model()
    cash = base["cash_pv_per_dollar"]
    bar = cash * v("givewell_bar")
    xs = [i / 100 for i in range(0, int(xmax * 100) + 1)]
    series = [(x, model({"p_transform": x})["ratio"]) for x in xs]
    ymax = max(max(y for _, y in series), bar) * 1.12
    plotw, ploth = W - pad_l - pad_r, H - pad_t - pad_b

    def X(x): return pad_l + plotw * (x / xmax)
    def Y(y): return pad_t + ploth * (1 - y / ymax)

    for i in range(5):
        yv = ymax * i / 4
        o.append(f'<line x1="{pad_l}" y1="{Y(yv)}" x2="{W - pad_r}" y2="{Y(yv)}" '
                 f'stroke="{GRID}" stroke-width="1"/>')
        o.append(text(pad_l - 10, Y(yv) + 4, f"{yv:.1f}", size=11.5, fill=MUTED,
                      anchor="end", tabular=True))
    for i in range(6):
        xv = xmax * i / 5
        o.append(text(X(xv), H - pad_b + 20, pct(xv, 0), size=11.5, fill=MUTED,
                      anchor="middle", tabular=True))

    # reference lines — status colours, each with a label, never colour alone
    for yv, lab, col in ((cash, f"unconditional cash — {cash:.2f}", "var(--pole-low)"),
                         (bar, f"GiveWell funding bar, {v('givewell_bar'):g}× — {bar:.2f}",
                          "var(--warning)")):
        o.append(f'<line x1="{pad_l}" y1="{Y(yv)}" x2="{W - pad_r}" y2="{Y(yv)}" '
                 f'stroke="{col}" stroke-width="2" stroke-dasharray="6 4"/>')
        o.append(text(W - pad_r, Y(yv) - 8, lab, size=12, fill=INK2, anchor="end",
                      weight=600))

    d = " ".join(f"{'M' if i == 0 else 'L'}{X(x):.1f} {Y(y):.1f}"
                 for i, (x, y) in enumerate(series))
    o.append(f'<path d="{d}" fill="none" stroke="{S1}" stroke-width="2" '
             f'stroke-linejoin="round"/>')
    o.append(text(X(xmax) - 8, Y(series[-1][1]) - 12, "this pipeline", size=12, fill=INK,
                  anchor="end", weight=600))
    for x, y in series[::5]:
        o.append(f'<circle cx="{X(x)}" cy="{Y(y)}" r="7" fill="transparent">'
                 f"<title>hit rate {pct(x, 0)} → {y:.2f} PV per $1 "
                 f"({y / cash:.2f}× cash)</title></circle>")

    # the base case, marked on the curve
    bp = v("p_transform")
    o.append(f'<circle cx="{X(bp)}" cy="{Y(base["ratio"])}" r="4.5" fill="{S1}" '
             f'stroke="{SURFACE}" stroke-width="2"/>')
    o.append(text(X(bp) + 10, Y(base["ratio"]) - 8,
                  f"base case {pct(bp, 0)} → {base['cash_multiple']:.2f}× cash",
                  size=11.5, fill=INK2))

    for p, col, lab in ((breakeven_p(), S1, "matches cash"),
                        (breakeven_p(multiple=v("givewell_bar")), "var(--warning)",
                         "clears the bar")):
        if p <= xmax:
            o.append(f'<line x1="{X(p)}" y1="{Y(0)}" x2="{X(p)}" y2="{Y(cash if lab == "matches cash" else bar)}" '
                     f'stroke="{col}" stroke-width="1.5" stroke-dasharray="3 3"/>')
            o.append(text(X(p), H - pad_b + 40, f"{pct(p, 1)} {lab}", size=11.5,
                          fill=INK2, anchor="middle", weight=600))

    o.append(f'<line x1="{pad_l}" y1="{Y(0)}" x2="{W - pad_r}" y2="{Y(0)}" '
             f'stroke="{AXIS}" stroke-width="1.5"/>')
    o.append(text(pad_l, H - 8, "share of funded firms that become transformational",
                  size=12, fill=MUTED))
    o.append(text(pad_l - 10, pad_t - 14, "PV income per $1 spent", size=12, fill=MUTED))
    o.append("</svg>")
    return "\n".join(o)


# ---------------------------------------------------------------------------
# Tables (the accessibility relief for every chart)
# ---------------------------------------------------------------------------

def table(headers: list[str], rows: list[list[str]], *, caption: str = "") -> str:
    h = "".join(f"<th scope='col'>{esc(x)}</th>" for x in headers)
    body = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in rows)
    cap = f"<caption>{esc(caption)}</caption>" if caption else ""
    return f"<table>{cap}<thead><tr>{h}</tr></thead><tbody>{body}</tbody></table>"


def details(summary: str, inner: str) -> str:
    return f"<details><summary>{esc(summary)}</summary>{inner}</details>"


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------

CSS = """
:root{color-scheme:light dark}
.viz-root,body{
  --surface-1:#fcfcfb; --page:#f9f9f7;
  --text-primary:#0b0b0b; --text-secondary:#52514e; --muted:#898781;
  --gridline:#e1e0d9; --baseline:#c3c2b7; --border:rgba(11,11,11,.10);
  --series-1:#2a78d6; --series-2:#eb6834; --series-3:#1baf7a;
  --pole-high:#2a78d6; --pole-low:#e34948;
  --good:#0ca30c; --warning:#fab219; --critical:#d03b3b;
}
@media (prefers-color-scheme:dark){
  :root:where(:not([data-theme=light])) .viz-root,
  :root:where(:not([data-theme=light])) body{
    --surface-1:#1a1a19; --page:#0d0d0d;
    --text-primary:#fff; --text-secondary:#c3c2b7; --muted:#898781;
    --gridline:#2c2c2a; --baseline:#383835; --border:rgba(255,255,255,.10);
    --series-1:#3987e5; --series-2:#d95926; --series-3:#199e70;
    --pole-high:#3987e5; --pole-low:#e66767;
  }
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--page); color:var(--text-primary);
  font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;
}
main{max-width:960px;margin:0 auto;padding:48px 24px 96px}
h1{font-size:34px;line-height:1.2;margin:0 0 8px;letter-spacing:-.02em}
h2{font-size:23px;margin:56px 0 12px;letter-spacing:-.01em;
   padding-top:20px;border-top:1px solid var(--border)}
h3{font-size:17px;margin:30px 0 8px}
p,li{color:var(--text-secondary)}
p{margin:0 0 14px}
strong{color:var(--text-primary);font-weight:600}
.sub{font-size:17px;color:var(--text-secondary);margin-bottom:6px}
.meta{font-size:13px;color:var(--muted);margin-bottom:32px}
figure{margin:22px 0 8px;background:var(--surface-1);border:1px solid var(--border);
       border-radius:10px;padding:18px}
figcaption{font-size:13px;color:var(--muted);margin-top:12px;line-height:1.5}
.chart{display:block;overflow:visible}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:24px 0}
.tile{background:var(--surface-1);border:1px solid var(--border);border-radius:10px;padding:16px}
.tile .v{font-size:29px;font-weight:600;color:var(--text-primary);letter-spacing:-.02em;
        line-height:1.15}
.tile .k{font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.4}
table{border-collapse:collapse;width:100%;font-size:13.5px;margin:14px 0}
caption{text-align:left;font-size:12.5px;color:var(--muted);padding-bottom:8px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);
      vertical-align:top}
th{color:var(--text-primary);font-weight:600;font-size:12.5px}
td{color:var(--text-secondary);font-variant-numeric:tabular-nums}
td:first-child,th:first-child{font-variant-numeric:normal}
details{margin:10px 0 0;font-size:13.5px}
summary{cursor:pointer;color:var(--muted);font-size:12.5px;padding:6px 0}
.callout{border-left:3px solid var(--series-1);background:var(--surface-1);
         border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0}
.callout.warn{border-left-color:var(--critical)}
.callout p:last-child{margin-bottom:0}
.tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:99px;
     border:1px solid var(--border);color:var(--muted);vertical-align:1px}
.tag.owner{color:var(--good);border-color:var(--good)}
.tag.unverified{color:var(--critical);border-color:var(--critical)}
ul{margin:0 0 14px;padding-left:22px}
li{margin-bottom:5px}
a{color:var(--series-1)}
.downloads{background:var(--surface-1);border:1px solid var(--border);border-radius:8px;
           padding:12px 16px;font-size:14px}
.downloads a{font-weight:600;text-decoration:none;border-bottom:1px solid var(--border)}
@media print{
  body{background:#fff}
  h2{page-break-after:avoid} figure{page-break-inside:avoid;border-color:#ccc}
  details{display:none}
}
"""


def build() -> str:
    m = model()
    tor = tornado()
    be, bem = breakeven_p(), breakeven_p("cost_marginal")
    bar_p = breakeven_p(multiple=v("givewell_bar"))

    voi = v("scale_ambition") * v("allocation_improvement")

    cost_rows = [
        ("Grants (50 × $1,000)", m["grants_total"], S1),
        ("Platform build — one-off", m["platform"], S2),
        ("Recruitment", m["recruitment"], S3),
        ("Six-month reviews", m["reviews"], S1),
        ("Administration", m["admin"], S2),
        ("Hosting + AI judging", m["hosting"] + m["judging"], S3),
    ]
    benefit_rows = [
        (f"Wages — {num(m['n_transform'], 1)} transformational firms", m["b_wages"], S1),
        ("Those owners' own income", m["b_owner"], S1),
        ("Their local suppliers", m["b_supplier"], S1),
        ("Tax they pay once formal", m["b_tax"], S1),
        (f"The other {num(m['funded'] - m['n_transform'], 1)} funded firms",
         m["benefit_other"], S2),
        (f"Learning, {num(m['unfunded_finishers'])} unfunded finishers",
         m["benefit_learning"], S3),
    ]

    param_rows = [[p.label, p.shown(), p.source, p.note] for p in PARAMS.values()]

    parts: list[str] = []
    A = parts.append

    A(f"<!doctype html><html lang='en'><head><meta charset='utf-8'>")
    A("<meta name='viewport' content='width=device-width,initial-scale=1'>")
    A("<title>Business Simulator — concept note and cost-effectiveness analysis</title>")
    A(f"<style>{CSS}</style></head><body class='viz-root'><main>")

    # ---- header
    A("<h1>Finding transformational firms at the lowest cost</h1>")
    A("<p class='sub'>A staged selection pipeline built on a free, offline business "
      "simulator — concept note and cost-effectiveness analysis.</p>")
    A("<p class='meta'>Generated by <code>scripts/build-concept-note.py</code>. "
      "Every figure below is computed from the parameters in the appendix. "
      "Most of those parameters are assumptions, and they are labelled as such.</p>")

    A("<div class='callout warn'><p><strong>Read this first.</strong> No part of this "
      "pipeline has been run. The simulator exists and is playable; the portal, the "
      "backend and the AI judge do not. Every behavioural rate in this model — how many "
      "people finish, how many apply, how many firms transform — is a guess with no "
      "data behind it. The analysis is here to show <em>what the answer depends on</em>, "
      "not to claim a result.</p></div>")

    # ---- the argument
    A("<h2>The argument</h2>")
    A("<p>The people who can build a firm larger than themselves are rare, and the "
      "conventional ways of finding them work poorly. Business-plan quality and pitch "
      "scores predict future performance weakly; judges select badly even in well-run "
      "competitions. What predicts better is <strong>observed execution</strong> — "
      "securing a paid trial, keeping proper records, updating sensibly when an "
      "assumption breaks.</p>")
    A("<p>So the problem is a <strong>search problem</strong>. This programme does not "
      "set out to create transformational firms. It sets out to <strong>find</strong> "
      "them cheaply and remove what is blocking them. That distinction drives the whole "
      "design: money buys search, which can be made almost free, plus unblocking for the "
      "few, which cannot.</p>")

    A("<div class='callout'><p><strong>The asymmetry that sets every gate.</strong> "
      "A false negative at the bottom of the funnel loses a transformational firm "
      f"permanently. A false positive costs {usd(v('grant_size'))}. Those are not "
      "remotely symmetric, and they invert as the tranches grow — so the pipeline is "
      "<strong>permissive early and strict late</strong>. Most of the pyramid failing is "
      "the design working.</p></div>")

    # ---- the intervention
    A("<h2>The intervention</h2>")
    A("<figure>")
    A(chart_funnel(m))
    A("<figcaption>The pipeline end to end. Solid boxes are stages; dashed boxes are what "
      "people receive when they do not progress. Volumes are modelled, not observed. "
      "Question references are to <code>memory/OPEN_QUESTIONS.md</code>.</figcaption>")
    A(details("Show as a table", table(
        ["Stage", "Volume", "Cost each", "What non-progressors get"],
        [["Recruitment", num(m["starts"]), usd(v("recruit_per_start"), 2), "—"],
         ["Stage 0 — simulator", f"{num(m['finishers'])} finish", "≈ $0",
          "Keep the learning"],
         ["Stage 1 — forecast", f"{num(m['applicants'])} submit",
          usd(v("judge_per_plan"), 2), "Portable record; comparison group; re-entry"],
         ["Grants", num(m["funded"]), usd(v("grant_size")), "Routed to existing programmes"],
         ["Stage 2", num(v("grants") * v("stage2_share")), usd(v("stage2_tranche")),
          "Back-office support stays available"],
         ["Stage 3", num(v("grants") * v("stage2_share") * v("stage3_share")),
          usd(v("stage3_tranche")), "—"]],
        caption="The intervention as a table.")))
    A("</figure>")

    A("<h3>Four design commitments</h3>")
    A("<ul>"
      "<li><strong>Grants, not equity or debt.</strong> A grant is non-dilutive equity: "
      "it enlarges the balance sheet so the firm can carry commercial debt later. Credit "
      "is not scarce for firms in the right range — <em>being bankable</em> is what is "
      "scarce.</li>"
      "<li><strong>Unrestricted and fixed.</strong> Money is fungible, so restricting it "
      "is theatre. The amount is fixed per round so the cohort stays comparable — "
      "variable amounts confound the founder with the size of the cheque. The tranche is "
      "sized as <em>the least that reveals whether the founder can absorb more</em>: an "
      "information purchase, not a needs assessment.</li>"
      "<li><strong>The bottleneck is working capital and inventory, not capex.</strong> "
      "Programmes systematically fund equipment because it is visible and photographs "
      "well. It is usually not what binds.</li>"
      "<li><strong>Support is offered, never required.</strong> Back-office and business "
      "management help, which is the mechanism that turns a grant into bankability: "
      "records become financials, financials become a credit assessment. Conditioning "
      "money on attendance is what produces training that serves trainers.</li>"
      "</ul>")

    A("<h2>Why the three stages are one instrument</h2>")
    A("<figure>")
    A(chart_loop())
    A("<figcaption>The simulator trains predict–reveal–diagnose across eighty turns. The "
      "stage-1 business plan is that same act on the founder's own firm: a dated, "
      "numeric forecast rather than a proposal. The six-month review is the reveal. "
      "Selection at each gate is on the quality of the explanation, not on hitting the "
      "number — grading accuracy alone rewards sandbagging.</figcaption>")
    A("</figure>")
    A("<p>This is what makes the plan resistant to being generated. Prose quality is not "
      "scored, so a fluent document earns nothing, and every number a model invents on "
      "the applicant's behalf comes back in six months. The portal strengthens it further "
      "by probing each applicant against <em>their own</em> stage-0 record — a follow-up "
      "no one else can answer for them.</p>")

    # ---- the pilot
    A("<h2>The pilot</h2>")
    A(f"<div class='tiles'>"
      f"<div class='tile'><div class='v'>{usd(m['grants_total'])}</div>"
      f"<div class='k'>grant budget — {num(m['funded'])} × {usd(v('grant_size'))}</div></div>"
      f"<div class='tile'><div class='v'>{usd(m['cost_total'])}</div>"
      f"<div class='k'>total pilot cost including the one-off build</div></div>"
      f"<div class='tile'><div class='v'>{pct(m['grants_total'] / m['cost_total'], 0)}</div>"
      f"<div class='k'>of the total that reaches founders as cash</div></div>"
      f"<div class='tile'><div class='v'>{usd(m['cost_per_finisher'])}</div>"
      f"<div class='k'>non-grant cost per person who finishes chapter 1</div></div>"
      f"</div>")
    A(f"<p>One cohort. {num(m['starts'])} people reached, {num(m['finishers'])} finish "
      f"chapter 1, {num(m['applicants'])} submit a forecast through the portal, "
      f"{num(m['funded'])} receive {usd(v('grant_size'))} — a selection ratio of "
      f"{pct(m['selection_ratio'], 0)}. Six months later everyone funded is reviewed "
      f"against their own forecast.</p>")

    A("<figure>")
    A(hbar(cost_rows, title="Where the pilot money goes"))
    A(f"<figcaption>Total {usd(m['cost_total'])}, of which "
      f"{pct(m['grants_total'] / m['cost_total'], 0)} reaches founders as cash. Building "
      f"the portal, the backend and the marking costs {usd(m['platform'])} because it is "
      f"done with an AI coding agent rather than a development team, and marking a "
      f"submission costs {PARAMS['judge_per_plan'].shown()}. Together they are "
      f"{pct((m['platform'] + m['judging']) / m['cost_total'], 1)} of the pilot. "
      f"<strong>What is left is almost entirely human contact</strong> — reaching people "
      f"and reviewing them.</figcaption>")
    A(details("Show as a table", table(
        ["Line", "USD", "Share of total"],
        [[l, usd(x), pct(x / m["cost_total"], 1)] for l, x, _ in cost_rows])))
    A("</figure>")

    # ---- CEA
    A("<h2>What a firm is worth, and to whom</h2>")
    A("<p>An earlier version of this model valued a transformational firm at its wage "
      "bill, held flat, stopping after six years. That is not what a firm is, and it is "
      "not what contributes to a country's long-run growth. Four things were missing, "
      "and each is counted separately here so each can be argued or removed on its "
      "own merits.</p>")
    A("<ul>"
      f"<li><strong>It grows and it persists.</strong> A fixed span was the wrong shape. "
      f"Jobs grow at {pct(v('job_growth'), 0)} a year and the firm survives each year "
      f"with probability {pct(v('survival_t'), 0)}, so the stream compounds and decays at "
      f"once rather than stopping on a chosen date. That alone takes the discount factor "
      f"from {annuity(6, v('discount')):.1f} to {m['pvf_t']:.1f}.</li>"
      f"<li><strong>The owner earns too.</strong> Counted at zero before, which was "
      f"simply wrong. Modelled at {pct(v('owner_ratio'), 0)} of the wage bill, net of "
      f"tax so it does not double-count the next line.</li>"
      f"<li><strong>A formal firm pays tax.</strong> {pct(v('tax_ratio'), 0)} of the wage "
      f"bill, valued at par with private income. This is what the formality chapters "
      f"exist to teach, and it is the most direct channel from one firm to public "
      f"goods.</li>"
      f"<li><strong>It buys locally.</strong> Backward linkages into suppliers, at "
      f"{pct(v('supplier_ratio'), 0)} of the wage bill. Developing a supplier is one of "
      f"the ways a transformational firm changes a value chain rather than just "
      f"occupying a place in it.</li>"
      "</ul>")
    A("<p><strong>Displacement is now split by firm type</strong>, which matters more "
      f"than it sounds. A livelihood firm mostly competes for the same local customers, "
      f"so {pct(v('displacement_o'), 0)} of its gain comes out of neighbours. A firm "
      f"opening an export line or a new market displaces less — {pct(v('displacement'), 0)}. "
      "Treating both at one rate was flattering to one and unfair to the other.</p>")
    A("<h3>And the livelihood firms are not just cash either</h3>")
    A(f"<p>The other {num(m['funded'] - m['n_transform'], 0)} funded firms were modelled "
      f"at roughly a cash transfer's effect. That understates them. A grant into a "
      f"trading business is not consumed the way a transfer largely is — it buys stock "
      f"that turns over — and these are firms that finished a filter and committed to a "
      f"forecast. <strong>The difference from handing over the same money is the "
      f"selection and the discipline, not the cash.</strong> Modelled at "
      f"{usd(v('gain_other_funded'))} a year, surviving {pct(v('survival_o'), 0)} "
      f"annually over {v('horizon_o'):g} years, and displacing at "
      f"{pct(v('displacement_o'), 0)}.</p>")
    A("<div class='callout warn'><p><strong>Adding benefit categories is the easiest way "
      "to make any programme look good.</strong> Every one of the additions above pushes "
      "the answer up, and none of them is measured. So the next section shows the ladder "
      "rather than the destination: what the answer is with only wages, and what each "
      "addition contributes. A reader who does not accept a rung can stop at the one "
      "below it and take that number instead.</p></div>")

    A("<h2>Cost-effectiveness</h2>")
    A("<p>Benefits are present-value income gains, discounted at "
      f"{pct(v('discount'), 0)}, net of displacement and of what would have happened "
      "anyway. The benchmark is the same money handed over as unconditional cash — the "
      "comparison a serious funder will eventually insist on.</p>")

    A("<figure>")
    A(hbar(benefit_rows, title="Where the benefit comes from"))
    A(f"<figcaption>Present value {usd(m['benefit_total'])}. The "
      f"{num(m['n_transform'], 0)} transformational firms supply "
      f"{pct(m['benefit_transform'] / m['benefit_total'], 0)} of it across four "
      f"components; that share rests entirely on a hit rate nobody has measured. Wages "
      f"alone are {pct(m['b_wages'] / m['benefit_total'], 0)} — counting only those was "
      f"the error in the first version of this note.</figcaption>")
    A(details("Show as a table", table(
        ["Source", "PV, USD", "Share"],
        [[l, usd(x), pct(x / m["benefit_total"], 1)] for l, x, _ in benefit_rows])))
    A("</figure>")

    A(f"<div class='tiles'>"
      f"<div class='tile'><div class='v'>{m['ratio']:.2f}</div>"
      f"<div class='k'>PV income per $1 — pilot cohort</div></div>"
      f"<div class='tile'><div class='v'>{m['cash_multiple']:.2f}×</div>"
      f"<div class='k'>multiple of unconditional cash</div></div>"
      f"<div class='tile'><div class='v'>{v('givewell_bar'):g}×</div>"
      f"<div class='k'>GiveWell's stated funding bar</div></div>"
      f"<div class='tile'><div class='v'>{usd(m['cost_per_transform'])}</div>"
      f"<div class='k'>cost per transformational firm found</div></div>"
      f"</div>")

    A(f"<p>In the base case the pipeline returns {m['ratio']:.2f} of present-value income "
      f"per dollar against a cash benchmark of {m['cash_pv_per_dollar']:.2f} — "
      f"<strong>{m['cash_multiple']:.2f}× unconditional cash</strong> — comfortably above "
      f"the benchmark and still <strong>short of GiveWell's stated "
      f"{v('givewell_bar'):g}× funding bar</strong>. Both statements are downstream of "
      f"assumptions nobody has measured, so read the ladder below before the "
      f"headline.</p>")
    A("<div class='callout'><p>Note what fell out of the cost side. Costing the portal "
      "and the marking at a development team's rates rather than an AI agent's added "
      "about 40% to the cost of the pilot and produced an amortisation story that turns "
      "out not to exist. <strong>Almost none of the remaining cost is technology</strong> "
      f"— {pct((m['platform'] + m['judging']) / m['cost_total'], 1)} of the total. It is "
      "grants, reaching people, and reviewing them, and the last two are human time: the "
      "one input that never amortises.</p></div>")

    A("<h3>The ladder, one rung at a time</h3>")
    A("<figure>")
    lad = scenarios()
    cash = m["cash_pv_per_dollar"]
    A(hbar([(lab, mult, S1 if i < 5 else S2) for i, (lab, _r, mult, _w) in enumerate(lad)],
           title="Multiple of unconditional cash, by how much of the benefit is counted",
           unit="x", labelw=310, width=880))
    A(f"<figcaption>Each bar adds one benefit component to the one above it. Wages alone "
      f"with a six-year cut-off gives <strong>{lad[0][2]:.2f}×</strong> cash — below the "
      f"benchmark. Counting what a firm actually produces gives "
      f"<strong>{lad[-1][2]:.2f}×</strong>. The honest reading of this programme is "
      f"somewhere on this ladder, and where depends on which components you "
      f"accept.</figcaption>")
    A(details("Show as a table", table(
        ["What is counted", "PV per $1", "× cash", "Why"],
        [[lab, f"{r:.2f}", f"{mult:.2f}×", why] for lab, r, mult, why in lad])))
    A("</figure>")
    A(f"<p>Two things are worth saying plainly about that chart. The first: <strong>the "
      f"single largest step is persistence and growth</strong> — "
      f"{lad[0][2]:.2f}× to {lad[1][2]:.2f}× — and it is not really an added benefit at "
      f"all. It is the correction of a modelling error, because a firm that is still "
      f"trading in year seven does not stop producing value on the anniversary of its "
      f"grant. The second: <strong>the base case is above the cash benchmark even with "
      f"no transformational firms at all</strong>, which is why the hit rate needed to "
      f"match cash falls to {pct(be, 2)}. The interesting question is no longer whether "
      f"this beats handing the money over. It is whether it clears a serious funder's "
      f"bar.</p>")

    A("<h3>What would have to be true</h3>")
    A("<figure>")
    A(chart_breakeven())
    A(f"<figcaption>The pipeline beats unconditional cash above a "
      f"<strong>{pct(be, 1)}</strong> transformational rate, and would need "
      f"<strong>{pct(bar_p, 0)}</strong> to clear GiveWell's {v('givewell_bar'):g}× "
      f"funding bar. Below the lower line the money is better handed over "
      f"directly.</figcaption>")
    A(details("Show as a table", table(
        ["Transformational rate", "Pilot cohort", "Later cohort", "vs cash"],
        [[pct(x, 0), f"{model({'p_transform': x})['ratio']:.2f}",
          f"{model({'p_transform': x})['ratio_marginal']:.2f}",
          f"{model({'p_transform': x})['cash_multiple_marginal']:.2f}×"]
         for x in (0.0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.15, 0.20)],
        caption=f"Unconditional cash benchmark: {m['cash_pv_per_dollar']:.2f} PV income "
                f"per $1.")))
    A("</figure>")
    A(f"<p>Those are the two numbers to argue about. Matching cash needs almost nothing "
      f"({pct(be, 2)}), because the livelihood firms and the learning already roughly "
      f"cover it. Is "
      f"{pct(bar_p, 0)}? That is demanding but not absurd for a group filtered this "
      "hard — and it is the number the pilot exists to put a real figure against.</p>")
    A(f"<p>Two honest responses to that, and they pull in opposite directions. The first: "
      f"GiveWell's bar is calibrated for direct-delivery programmes with measured effect "
      f"sizes, and applying it to a search intervention whose value is a fat tail and an "
      f"option is a category error. The second, which deserves more weight: "
      f"<strong>every programme that misses the bar says something like the first "
      f"thing.</strong> The defensible position is not that the bar does not apply, but "
      f"that this pilot is unusually cheap for the information it produces — and that "
      f"the case rests on the value of that information rather than on this cohort's "
      f"direct benefit.</p>")

    A("<h3>What the answer depends on</h3>")
    A("<figure>")
    A(chart_tornado(tor))
    A("<figcaption>Each bar is the benefit-cost ratio as one parameter moves across its "
      "plausible range, everything else held at base. Sorted by swing. Red arms are the "
      "pessimistic end, blue the optimistic.</figcaption>")
    A(details("Show as a table", table(
        ["Parameter", "Low → ratio", "High → ratio", "Swing"],
        [[PARAMS[k].label, f"{lo:.2f}", f"{hi:.2f}", f"{sw:.2f}"] for k, lo, hi, sw in tor])))
    A("</figure>")
    A(f"<p>The result is dominated by <strong>{PARAMS[tor[0][0]].label.lower()}</strong> "
      f"and <strong>{PARAMS[tor[1][0]].label.lower()}</strong> — that is, by the size and "
      "frequency of the tail. Everything operational (recruitment cost, completion rate, "
      "the platform build) barely moves the answer. <strong>This is a venture portfolio, "
      "not a service-delivery programme</strong>, and it should be argued for and "
      "evaluated as one.</p>")

    # ---- VOI
    A("<h2>The pilot's real output is the dataset</h2>")
    A(f"<p>If the pipeline eventually allocates {usd(v('scale_ambition'))}, then a "
      f"validated filter that improves allocation by just "
      f"{pct(v('allocation_improvement'), 0)} is worth {usd(voi)} — roughly "
      f"<strong>{voi / m['cost_total']:.0f}× the entire cost of the pilot</strong>. The "
      "direct benefit of one cohort is close to a rounding error next to the value of "
      "knowing whether the filter works at all.</p>")

    A("<div class='callout warn'><p><strong>Which is why the pilot must be designed as an "
      "experiment, not just as a programme.</strong> If every grant goes to the "
      "highest-ranked applicants, then everyone observed at six months is someone the "
      "filter already liked, and the variation the filter was meant to explain has been "
      "removed. You cannot tell whether a filter works by looking only at what it passed. "
      "This is the standard reason selection instruments never get validated — and it is "
      "the same failure this project criticises in the sector.</p></div>")

    A("<h3>Three things that cannot be added later</h3>")
    A("<ul>"
      f"<li><strong>Randomise a slice of the grants.</strong> Award most by rank; "
      f"allocate a reserved portion at random across the rest of the distribution. If the "
      f"randomised firms do as well, the filter is not selecting on anything. Cost: some "
      f"of the {num(m['funded'])} grants go to applicants the instrument did not "
      "favour.</li>"
      "<li><strong>Blind the judge and store everything raw.</strong> Score every "
      "applicant including the unfunded; keep raw portal submissions, not scores. An AI "
      "judge is re-runnable — you can re-score the whole cohort next year against a "
      "better rubric, but only if the transcripts still exist. A judge that can see the "
      "stage-0 rank produces a contaminated score that can never be decomposed.</li>"
      "<li><strong>Admit a small arm without the game.</strong> Otherwise \"the "
      "simulator taught them\" and \"the simulator found them\" are indistinguishable "
      "forever.</li>"
      "</ul>")
    A("<p>A fourth costs one database field and should not be a decision at all: "
      "<strong>record the recruitment channel for every participant.</strong> Whoever the "
      "channel reaches is the population everything downstream selects from — a filter "
      "far coarser than the simulator, sitting above it, currently unmeasured.</p>")

    # ---- measurement
    A("<h2>What gets measured</h2>")
    A("<p>Selection is on the quality of a founder's reflection: can they say what went "
      "well, what went wrong, and how they adjusted. That is a defensible thing to select "
      "on. It is <strong>not</strong> an outcome measure, and the two must not be "
      "conflated — \"people we selected for reflecting well went on to reflect well\" is "
      "circular, and it will not satisfy the funder this pilot is meant to convince.</p>")
    A(table(["", "Selection criterion", "Validation measure"],
            [["What it is", "Decides who gets the next tranche",
              "The objective thing you check the criterion against"],
             ["Here", "Forecast vs actual, and the explanation of the gap",
              "Bankability first — did a commercial lender extend credit; then survival, "
              "employment defined properly, owner income"],
             ["Why", "Coherent with what the simulator trains",
              "Third-party verified. Nobody talks their way past a credit committee"]],
            caption="Two different jobs. Both are needed."))
    A("<p>Funded firms also submit <strong>monthly photo evidence</strong> — the record "
      "book, what the grant bought, premises and stock. A photograph of the ledger "
      "verifies the record-keeping criterion directly instead of asking about it, which "
      "is the answer to a sector that reports growth from self-reported surveys. "
      "Responding month after month is itself observed execution. Photos corroborate a "
      "forecast; they are not proof, and chasing forgery would be an arms race run "
      "against people who are mostly honest.</p>")

    # ---- risks
    A("<h2>What could make this fail</h2>")
    A(table(["Risk", "Why it bites", "Cheapest mitigation"],
            [["The tail is thinner than assumed",
              f"Below a {pct(bem, 1)} hit rate the money is better given away directly",
              "The randomised slice measures it in one cohort"],
             ["Recruitment reaches the wrong people",
              "Paid ads reach urban, literate, data-rich applicants — close to the "
              "opposite of the target",
              "Record the channel per participant; run two or three in parallel"],
             ["Nobody finishes the simulator",
              "Two hours is a lot to ask before any money is visible",
              "Gate on chapter 1 only; treat later chapters as ranking signal"],
             ["The AI judge is itself an unvalidated filter",
              "A second unvalidated instrument between people and money compounds the "
              "risk rather than averaging it",
              "Blind scoring plus stored transcripts make it re-runnable and testable"],
             ["Selection on reflection selects for articulacy",
              "That is the pitch-quality failure this project exists to avoid, "
              "re-entering through the back door",
              "Grade application to the applicant's own numbers; offer an oral route"],
             ["Regional figures are wrong",
              "The simulator is authored in Tanzanian contexts and has not been checked "
              "by anyone with local ground truth",
              "Local review before any cohort — cheap now, systematic exclusion at "
              "scale"]]))

    # ---- appendix
    # ---- the working
    A("<h2>The working</h2>")
    A("<p>Every step of the calculation, in order, with the formula beside it. This is "
      "the whole model — there is nothing behind it that is not on this page. It is also "
      "shipped as a spreadsheet with live formulas, so you can change an input and watch "
      "the answer move rather than taking these numbers on trust.</p>")
    A("<p class='downloads'>"
      "<a href='./concept-note-model.xlsx'>Download the workbook (.xlsx)</a> · "
      "<a href='./concept-note-model.csv'>the same calculation as CSV</a> · "
      "<a href='../scripts/lib/cea_model.py'>the model in Python</a></p>")
    A("<p>The workbook follows GiveWell's structure: inputs separated from calculation, "
      "adjustments applied explicitly and named, and the answer expressed as a multiple "
      "of the cash benchmark. Shaded cells on the Inputs sheet are the only ones to "
      "edit; every other cell is a formula. A check in the repository evaluates that "
      "formula graph independently and asserts it reproduces the Python model, so the "
      "spreadsheet and this page cannot drift apart.</p>")

    sections: dict[str, list[list[str]]] = {}
    for sec, step, formula, value in derivation():
        sections.setdefault(sec, []).append([step, formula, value])
    for sec, rows in sections.items():
        A(f"<h3>{esc(sec)}</h3>")
        A(table(["Step", "Formula", "Value"], rows))

    A("<h2>Appendix — every parameter</h2>")
    A("<p>The model is about ninety lines of arithmetic in "
      "<code>scripts/build-concept-note.py</code>. Change any value there and this "
      "document regenerates. Source tags: <span class='tag owner'>owner</span> stated by "
      "the project owner; <span class='tag'>assumption</span> chosen to make the model "
      "run, with no evidence behind it; <span class='tag unverified'>unverified</span> "
      "recalled from the literature and not yet checked — do not repeat these as "
      "fact.</p>")
    A(table(["Parameter", "Value", "Source", "Note"], param_rows))

    A("<h3>Model outputs</h3>")
    A(table(["Output", "Pilot cohort", "Later cohort"],
            [["Total cost", usd(m["cost_total"]), usd(m["cost_marginal"])],
             ["PV benefit", usd(m["benefit_total"]), usd(m["benefit_total"])],
             ["PV income per $1", f"{m['ratio']:.2f}", f"{m['ratio_marginal']:.2f}"],
             ["Multiple of unconditional cash", f"{m['cash_multiple']:.2f}×",
              f"{m['cash_multiple_marginal']:.2f}×"],
             ["Breakeven transformational rate", pct(be, 1), pct(bem, 1)],
             ["Cost per transformational firm", usd(m["cost_per_transform"]), "—"]]))

    A("<p class='meta' style='margin-top:40px'>Method note: benefits are present-valued "
      f"at {pct(v('discount'), 0)}; transformational gains are reduced by "
      f"{pct(v('displacement'), 0)} for displacement of other local firms and a further "
      f"{pct(v('counterfactual'), 0)} for what would have happened anyway. Charts use a "
      "colour palette validated for colour-vision deficiency in both light and dark "
      "modes; every chart carries direct labels and a table view, so no figure is "
      "conveyed by colour alone.</p>")

    A("</main></body></html>")
    return "\n".join(parts)


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build(), encoding="utf-8")
    csv_path = write_csv()
    m = model()
    print(f"wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:.1f} KB)")
    print(f"wrote {csv_path.relative_to(ROOT)}")
    print(f"  pilot cost      {usd(m['cost_total'])}   later cohort {usd(m['cost_marginal'])}")
    print(f"  PV benefit      {usd(m['benefit_total'])}")
    print(f"  ratio           {m['ratio']:.3f}  (cash {m['cash_pv_per_dollar']:.3f}) "
          f"= {m['cash_multiple']:.2f}x")
    print(f"  later cohort    {m['ratio_marginal']:.3f} = {m['cash_multiple_marginal']:.2f}x")
    print(f"  breakeven rate  {pct(breakeven_p(), 1)} pilot / "
          f"{pct(breakeven_p('cost_marginal'), 1)} later")
    print(f"  top drivers     " + ", ".join(k for k, _, _, _ in tornado()[:3]))
