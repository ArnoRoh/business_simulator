"""The cost-effectiveness model, shared by every builder that renders it.

Stdlib only. Imported by `build-concept-note.py` (the HTML note) and
`build-model-xlsx.py` (the spreadsheet). Keeping one copy of the arithmetic is the
whole point: a figure can never disagree between the note and the workbook, because
there is only one place it is computed.

Read the source tag on a parameter before quoting it. Most say `assumption`.
"""

from __future__ import annotations

import html
import math
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DOCS = ROOT / "docs"

# ---------------------------------------------------------------------------
# Parameters
# ---------------------------------------------------------------------------
# source tags:
#   owner      — stated by the project owner, recorded in memory/DECISIONS.md
#   assumption — chosen to make the model run. Not evidence. Vary it in the tornado.
#   unverified — recalled from the literature and NOT yet checked against a source.
#                AGENTS.md §6: do not repeat these as fact.


@dataclass
class P:
    value: float
    label: str
    source: str
    note: str = ""
    fmt: str = "num"          # num | usd | usd2 | pct | years

    def shown(self) -> str:
        if self.fmt == "usd":
            return f"${self.value:,.0f}"
        if self.fmt == "usd2":
            return f"${self.value:,.2f}"
        if self.fmt == "usd4":
            return f"${self.value:,.4f}".rstrip("0").rstrip(".")
        if self.fmt == "mult":
            return f"{self.value:g}\u00d7"
        if self.fmt == "pct":
            return f"{self.value * 100:g}%"
        if self.fmt == "years":
            return f"{self.value:g} years"
        return f"{self.value:,.0f}"


PARAMS: dict[str, P] = {
    # --- the funnel -------------------------------------------------------
    "starts": P(3000, "Stage-0 starts in the pilot", "assumption",
                "Nobody has chosen a recruitment channel yet (Q-039).", fmt="num"),
    "ch1_completion": P(0.35, "Share of starts that finish chapter 1", "assumption",
                        "Untested. No completion data exists for any build.", fmt="pct"),
    "application_rate": P(0.20, "Share of finishers who submit a forecast", "assumption",
                          "The portal does not exist yet (Q-035).", fmt="pct"),
    "grants": P(50, "Grants awarded at stage 1", "owner", "USD 50,000 ÷ 1,000 (D-035).", fmt="num"),
    "grant_size": P(1000, "Stage-1 grant, USD", "owner", "D-034.", fmt="usd"),

    # --- pilot costs ------------------------------------------------------
    "recruit_per_start": P(2.00, "Recruitment cost per stage-0 start, USD", "assumption",
                           "Blended word-of-mouth and paid; wholly channel-dependent.", fmt="usd2"),
    "platform_build": P(100, "One-off build: portal, backend, AI judge, USD", "owner",
                        "Built with an AI coding agent, not a dev team. Owner's figure.", fmt="usd"),
    "judge_per_plan": P(0.01, "AI marking cost per submission, USD", "owner",
                        "Owner's figure. Model inference, including follow-up probes.", fmt="usd4"),
    "review_per_funded": P(150, "Six-month review per funded firm, USD", "assumption",
                           "Mostly asynchronous: photos, portal, one call.", fmt="usd"),
    "hosting_per_cohort": P(200, "Hosting and data for one cohort, USD", "assumption",
                            "Stage 0 is a static PWA; this is close to a floor.", fmt="usd"),
    "admin_rate": P(0.15, "Programme administration overhead", "assumption", fmt="pct"),

    # --- what happens to the funded --------------------------------------
    "p_transform": P(0.06, "Share of funded firms that become transformational", "assumption",
                     "THE critical unknown. The pilot exists to measure it (Q-034).", fmt="pct"),
    # A transformational firm is defined by growing an organisation, so it is modelled as
    # a growing, surviving firm — not a fixed wage bill that stops on a chosen year. The
    # non-wage components are expressed as ratios to the wage bill rather than as invented
    # absolute figures: easier to argue with, and harder to inflate quietly.
    "jobs_initial": P(5, "Jobs at the point of the grant", "assumption",
                      "Where the firm starts, not where it ends.", fmt="num"),
    "job_growth": P(0.12, "Annual growth in jobs", "assumption",
                    "Building an organisation larger than the founder is the definition of "
                    "transformational (AGENTS.md §2).", fmt="pct"),
    "survival_t": P(0.92, "Annual survival probability, transformational firm", "assumption",
                    "Replaces a hard cut-off year. A firm still trading keeps producing.",
                    fmt="pct"),
    "horizon_t": P(15, "Horizon, transformational firm", "assumption",
                   "Survival does the decaying; the horizon only bounds the sum.",
                   fmt="years"),
    "income_per_job": P(600, "Annual income gain per job, USD", "assumption",
                        "Gain over the counterfactual occupation, not the wage.", fmt="usd"),
    "owner_ratio": P(0.35, "Owner's own net income gain, as a share of the wage bill",
                     "assumption",
                     "Net of tax, so it does not double-count the tax line.", fmt="pct"),
    "tax_ratio": P(0.25, "Tax paid, as a share of the wage bill", "assumption",
                   "Formalisation is what chapters 3–4 teach. Paid out of profit, so no "
                   "double count with owner income.", fmt="pct"),
    "public_value": P(1.0, "Value of $1 of public revenue vs $1 of private income",
                      "assumption",
                      "1.0 treats tax as neutral. Argue up for public goods, down for "
                      "leakage. Set to 0 to exclude tax entirely.", fmt="num"),
    "supplier_ratio": P(0.30, "Local supplier income gain, as a share of the wage bill",
                        "assumption",
                        "Backward linkages — the firm buys inputs from local suppliers and "
                        "develops them.", fmt="pct"),
    "displacement": P(0.15, "Displacement share — transformational firm", "assumption",
                      "Lower than a livelihood firm: new markets and exports displace less "
                      "than another shop on the same street.", fmt="pct"),
    "counterfactual": P(0.50, "Share of transformational outcomes that would have happened anyway",
                        "assumption", "These are, by selection, the most capable applicants.", fmt="pct"),

    # --- the other funded firms ------------------------------------------
    # Not "spraying money": a grant into a trading business is not consumed the way a
    # transfer largely is, and these firms were selected and have made a forecast. What
    # differs from unconditional cash is the selection and the discipline, not the cash.
    "gain_other_funded": P(450, "Annual income gain, non-transformational funded firm, USD",
                           "assumption",
                           "Capital stays in a working business rather than being consumed.",
                           fmt="usd"),
    "survival_o": P(0.85, "Annual survival probability, other funded firm", "assumption",
                    fmt="pct"),
    "horizon_o": P(8, "Horizon, other funded firm", "assumption", fmt="years"),
    "displacement_o": P(0.40, "Displacement share — livelihood firm", "assumption",
                        "High: mostly competing for the same local customers.", fmt="pct"),
    "counterfactual_other": P(0.20, "Counterfactual share for non-transformational firms",
                              "assumption", fmt="pct"),

    # --- the people who never get money ----------------------------------
    "gain_per_learner": P(12, "Annual income gain per unfunded finisher, USD", "assumption",
                          "Small per head, large N. Genuinely unmeasured.", fmt="usd"),
    "years_learner": P(2, "Years the learning gain persists", "assumption", fmt="years"),
    "learner_haircut": P(0.50, "Uncertainty haircut on the learning effect", "assumption",
                         "Generic business training has a weak evidence base.", fmt="pct"),

    # --- the benchmark ----------------------------------------------------
    "cash_gain_annual": P(270, "Annual income gain from a USD 1,000 cash transfer", "unverified",
                          "Roughly GiveDirectly-shaped. NOT checked against a source.", fmt="usd"),
    "givewell_bar": P(6, "GiveWell funding bar, multiples of the cash benchmark", "sourced",
                      "givewell.org, cost-effectiveness models page, stated as of May 2026.",
                      fmt="mult"),
    "cash_years": P(3, "Years the cash-transfer gain persists", "unverified", fmt="years"),

    # --- the later pyramid ------------------------------------------------
    "stage2_tranche": P(10000, "Stage-2 fixed tranche, USD", "assumption",
                        "Owner: the least that reveals absorptive capacity (D-038).", fmt="usd"),
    "stage2_share": P(0.24, "Share of stage-1 firms advancing to stage 2", "assumption", fmt="pct"),
    "stage3_tranche": P(60000, "Stage-3 fixed tranche, USD", "assumption", fmt="usd"),
    "stage3_share": P(0.25, "Share of stage-2 firms advancing to stage 3", "assumption", fmt="pct"),

    # --- value of information --------------------------------------------
    "scale_ambition": P(100_000_000, "Capital the pipeline might eventually allocate, USD",
                        "owner", "'Hundreds of millions' — modelled at 100m, conservatively.", fmt="usd"),
    "allocation_improvement": P(0.01, "Allocation improvement a validated filter buys",
                                "assumption", "One percent. Deliberately timid.", fmt="pct"),

    "discount": P(0.05, "Annual discount rate", "assumption", fmt="pct"),
}


def v(key: str) -> float:
    return PARAMS[key].value


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def annuity(years: float, rate: float) -> float:
    """Present value of 1 per year for `years`, discounted at `rate`."""
    if rate == 0:
        return years
    return (1 - (1 + rate) ** -years) / rate


def pv_stream(years: float, rate: float, growth: float = 0.0, survival: float = 1.0) -> float:
    """PV of 1 in year 1, growing at `growth`, surviving at `survival`, discounted.

    A hard "the benefit lasts N years and then stops" is the wrong shape for a firm.
    A firm that is still trading keeps producing, and a transformational one is bigger
    each year — so the stream grows and decays at the same time, and the horizon only
    bounds the sum rather than defining the effect. With growth 0 and survival 1 this
    reduces exactly to `annuity`.
    """
    r = (1 + growth) * survival / (1 + rate)
    n = int(years)
    if abs(r - 1) < 1e-12:
        return n / (1 + rate)
    return (1 / (1 + rate)) * (1 - r ** n) / (1 - r)


def model(over: dict[str, float] | None = None) -> dict[str, float]:
    """Run the whole model. `over` overrides parameters, for sensitivity runs."""
    g = dict((k, p.value) for k, p in PARAMS.items())
    if over:
        g.update(over)
    d = g["discount"]

    # funnel
    starts = g["starts"]
    finishers = starts * g["ch1_completion"]
    applicants = finishers * g["application_rate"]
    funded = min(g["grants"], applicants)
    unfunded_finishers = max(finishers - funded, 0)
    selection_ratio = funded / applicants if applicants else 0

    # costs
    grants_total = funded * g["grant_size"]
    recruitment = starts * g["recruit_per_start"]
    judging = applicants * g["judge_per_plan"]
    reviews = funded * g["review_per_funded"]
    direct = (grants_total + recruitment + g["platform_build"]
              + judging + reviews + g["hosting_per_cohort"])
    admin = direct * g["admin_rate"]
    cost_total = direct + admin
    # a later cohort does not pay to build the platform again
    cost_marginal = (direct - g["platform_build"]) * (1 + g["admin_rate"])

    # benefits — stream 1: transformational firms
    #
    # A wage bill alone is the wrong measure of what a firm contributes. Four components,
    # each separately arguable and each individually removable by zeroing its parameter:
    # the wages it pays, the owner's own income, the tax it pays once formal, and the
    # income its local suppliers earn. The last three are ratios to the wage bill.
    n_transform = funded * g["p_transform"]
    pvf_t = pv_stream(g["horizon_t"], d, g["job_growth"], g["survival_t"])
    wage_bill_y1 = g["jobs_initial"] * g["income_per_job"]
    pv_wages = wage_bill_y1 * pvf_t
    pv_owner = pv_wages * g["owner_ratio"]
    pv_tax = pv_wages * g["tax_ratio"] * g["public_value"]
    pv_supplier = pv_wages * g["supplier_ratio"]
    pv_gross_t = pv_wages + pv_owner + pv_tax + pv_supplier
    adj_t = (1 - g["displacement"]) * (1 - g["counterfactual"])
    pv_per_transform = pv_gross_t * adj_t
    benefit_transform = n_transform * pv_per_transform

    # stream 2: the other funded firms
    n_other = funded - n_transform
    pvf_o = pv_stream(g["horizon_o"], d, 0.0, g["survival_o"])
    benefit_other = (n_other * g["gain_other_funded"] * pvf_o
                     * (1 - g["displacement_o"]) * (1 - g["counterfactual_other"]))

    # stream 3: everyone who finished and got nothing
    benefit_learning = (unfunded_finishers * g["gain_per_learner"]
                        * annuity(g["years_learner"], d) * g["learner_haircut"])

    benefit_total = benefit_transform + benefit_other + benefit_learning

    # benchmark: the same money as unconditional cash
    cash_pv_per_dollar = (g["cash_gain_annual"] * annuity(g["cash_years"], d)) / 1000.0

    ratio = benefit_total / cost_total if cost_total else 0
    ratio_marginal = benefit_total / cost_marginal if cost_marginal else 0

    return {
        "starts": starts, "finishers": finishers, "applicants": applicants,
        "funded": funded, "unfunded_finishers": unfunded_finishers,
        "selection_ratio": selection_ratio,
        "grants_total": grants_total, "recruitment": recruitment,
        "platform": g["platform_build"], "judging": judging, "reviews": reviews,
        "hosting": g["hosting_per_cohort"], "admin": admin,
        "cost_total": cost_total, "cost_marginal": cost_marginal,
        "n_transform": n_transform, "pv_per_transform": pv_per_transform,
        "pvf_t": pvf_t, "pvf_o": pvf_o, "wage_bill_y1": wage_bill_y1,
        "pv_wages": pv_wages, "pv_owner": pv_owner, "pv_tax": pv_tax,
        "pv_supplier": pv_supplier, "pv_gross_t": pv_gross_t,
        "b_wages": n_transform * pv_wages * adj_t,
        "b_owner": n_transform * pv_owner * adj_t,
        "b_tax": n_transform * pv_tax * adj_t,
        "b_supplier": n_transform * pv_supplier * adj_t,
        "benefit_transform": benefit_transform, "benefit_other": benefit_other,
        "benefit_learning": benefit_learning, "benefit_total": benefit_total,
        "cash_pv_per_dollar": cash_pv_per_dollar,
        "ratio": ratio, "ratio_marginal": ratio_marginal,
        "cash_multiple": ratio / cash_pv_per_dollar if cash_pv_per_dollar else 0,
        "cash_multiple_marginal": ratio_marginal / cash_pv_per_dollar if cash_pv_per_dollar else 0,
        "cost_per_transform": cost_total / n_transform if n_transform else float("inf"),
        "cost_per_finisher": (cost_total - grants_total) / finishers if finishers else 0,
    }


def breakeven_p(cost_key: str = "cost_total", multiple: float = 1.0) -> float:
    """Transformational rate needed to reach `multiple` × the cash benchmark."""
    base = model()
    target_benefit = base["cash_pv_per_dollar"] * multiple * base[cost_key]
    floor = base["benefit_other"] + base["benefit_learning"]
    needed = (target_benefit - floor) / base["pv_per_transform"]
    return max(needed / base["funded"], 0)


# ---------------------------------------------------------------------------
# The working — every step of arithmetic, shown
# ---------------------------------------------------------------------------
# One source for both the HTML tables and the CSV, so the spreadsheet a reader
# downloads is literally the calculation the page describes.

def derivation() -> list[tuple[str, str, str, str]]:
    """(section, step, formula, value) for every line of the calculation."""
    m = model()
    d = v("discount")
    a_l = annuity(v("years_learner"), d)
    a_c = annuity(v("cash_years"), d)
    rows: list[tuple[str, str, str, str]] = []

    def r(sec, step, formula, value):
        rows.append((sec, step, formula, value))

    # 1 — funnel
    r("1. Funnel", "People reached", "input", num(m["starts"]))
    r("1. Funnel", "Finish chapter 1", f"{num(m['starts'])} × {pct(v('ch1_completion'), 0)}",
      num(m["finishers"]))
    r("1. Funnel", "Submit a forecast",
      f"{num(m['finishers'])} × {pct(v('application_rate'), 0)}", num(m["applicants"]))
    r("1. Funnel", "Funded", f"min({num(v('grants'))}, {num(m['applicants'])})", num(m["funded"]))
    r("1. Funnel", "Selection ratio", f"{num(m['funded'])} ÷ {num(m['applicants'])}",
      pct(m["selection_ratio"], 1))
    r("1. Funnel", "Finishers who get nothing",
      f"{num(m['finishers'])} − {num(m['funded'])}", num(m["unfunded_finishers"]))

    # 2 — cost
    r("2. Cost", "Grants", f"{num(m['funded'])} × {usd(v('grant_size'))}", usd(m["grants_total"]))
    r("2. Cost", "Recruitment", f"{num(m['starts'])} × {usd(v('recruit_per_start'), 2)}",
      usd(m["recruitment"]))
    r("2. Cost", "Six-month reviews", f"{num(m['funded'])} × {usd(v('review_per_funded'))}",
      usd(m["reviews"]))
    r("2. Cost", "Hosting", "input", usd(m["hosting"]))
    r("2. Cost", "Platform build (one-off)", "input — AI-built, not a dev team",
      usd(m["platform"]))
    r("2. Cost", "AI marking",
      f"{num(m['applicants'])} × {PARAMS['judge_per_plan'].shown()}", usd(m["judging"], 2))
    r("2. Cost", "Subtotal", "sum of the above", usd(m["cost_total"] - m["admin"]))
    r("2. Cost", "Administration",
      f"subtotal × {pct(v('admin_rate'), 0)}", usd(m["admin"]))
    r("2. Cost", "TOTAL COST", "subtotal + administration", usd(m["cost_total"]))

    # 3 — benefit stream 1
    s = "3. Benefit — transformational firms"
    r(s, "Transformational firms",
      f"{num(m['funded'])} × {pct(v('p_transform'), 0)}", num(m["n_transform"], 1))
    r(s, "Jobs at the grant", "input", num(v("jobs_initial")))
    r(s, "Annual income gain per job", "input", usd(v("income_per_job")))
    r(s, "Wage bill, year 1",
      f"{num(v('jobs_initial'))} × {usd(v('income_per_job'))}", usd(m["wage_bill_y1"]))
    r(s, f"PV factor — grows {pct(v('job_growth'), 0)}, survives "
         f"{pct(v('survival_t'), 0)}, {v('horizon_t'):g}y",
      "sum of ((1+g)·s/(1+d))^t", f"{m['pvf_t']:.4f}")
    r(s, "PV of wages", "wage bill × PV factor", usd(m["pv_wages"]))
    r(s, f"+ owner's own income ({pct(v('owner_ratio'), 0)} of wages)",
      f"× {v('owner_ratio'):.2f}", usd(m["pv_owner"]))
    r(s, f"+ tax paid ({pct(v('tax_ratio'), 0)} of wages, valued at {v('public_value'):g})",
      f"× {v('tax_ratio'):.2f} × {v('public_value'):g}", usd(m["pv_tax"]))
    r(s, f"+ local supplier income ({pct(v('supplier_ratio'), 0)} of wages)",
      f"× {v('supplier_ratio'):.2f}", usd(m["pv_supplier"]))
    r(s, "Gross PV per firm", "sum of the four components", usd(m["pv_gross_t"]))
    r(s, f"less displacement ({pct(v('displacement'), 0)})",
      f"× {1 - v('displacement'):.2f}", usd(m["pv_gross_t"] * (1 - v("displacement"))))
    r(s, f"less counterfactual ({pct(v('counterfactual'), 0)})",
      f"× {1 - v('counterfactual'):.2f}", usd(m["pv_per_transform"]))
    r(s, "STREAM TOTAL", f"{num(m['n_transform'], 1)} firms × {usd(m['pv_per_transform'])}",
      usd(m["benefit_transform"]))

    # 4 — benefit stream 2
    s = "4. Benefit — other funded firms"
    r(s, "Firms", f"{num(m['funded'])} − {num(m['n_transform'], 1)}",
      num(m["funded"] - m["n_transform"], 1))
    r(s, "Annual gain each", "input", usd(v("gain_other_funded")))
    r(s, f"PV factor — survives {pct(v('survival_o'), 0)}, {v('horizon_o'):g}y",
      "sum of (s/(1+d))^t", f"{m['pvf_o']:.4f}")
    r(s, f"less displacement ({pct(v('displacement_o'), 0)})",
      f"× {1 - v('displacement_o'):.2f}", "—")
    r(s, f"less counterfactual ({pct(v('counterfactual_other'), 0)})",
      f"× {1 - v('counterfactual_other'):.2f}", "—")
    r(s, "STREAM TOTAL", "firms × gain × PV factor × adjustments", usd(m["benefit_other"]))

    # 5 — benefit stream 3
    s = "5. Benefit — learning, unfunded finishers"
    r(s, "People", f"{num(m['finishers'])} − {num(m['funded'])}", num(m["unfunded_finishers"]))
    r(s, "Annual gain each", "input", usd(v("gain_per_learner")))
    r(s, f"PV factor, {v('years_learner'):g}y", f"annuity at {pct(v('discount'), 0)}",
      f"{a_l:.4f}")
    r(s, f"Uncertainty haircut ({pct(v('learner_haircut'), 0)})",
      f"× {v('learner_haircut'):.2f}", "—")
    r(s, "STREAM TOTAL", "people × gain × PV factor × haircut", usd(m["benefit_learning"]))

    # 6 — the benchmark
    s = "6. Cash benchmark"
    r(s, "Transfer", "input", usd(1000))
    r(s, "Annual income gain", "input (unverified)", usd(v("cash_gain_annual")))
    r(s, f"PV factor, {v('cash_years'):g}y", f"annuity at {pct(v('discount'), 0)}", f"{a_c:.4f}")
    r(s, "PV income per $1 of cash",
      f"({usd(v('cash_gain_annual'))} × {a_c:.4f}) ÷ {usd(1000)}",
      f"{m['cash_pv_per_dollar']:.3f}")

    # 7 — result
    s = "7. Result"
    r(s, "Total PV benefit", "streams 3 + 4 + 5", usd(m["benefit_total"]))
    r(s, "Total cost", "from section 2", usd(m["cost_total"]))
    r(s, "PV income per $1 spent",
      f"{usd(m['benefit_total'])} ÷ {usd(m['cost_total'])}", f"{m['ratio']:.3f}")
    r(s, "Multiple of cash",
      f"{m['ratio']:.3f} ÷ {m['cash_pv_per_dollar']:.3f}", f"{m['cash_multiple']:.2f}×")
    r(s, "GiveWell funding bar", "sourced", f"{v('givewell_bar'):g}×")
    r(s, "Hit rate to match cash", "solve for p_transform", pct(breakeven_p(), 1))
    r(s, "Hit rate to clear the bar", f"solve for {v('givewell_bar'):g}× cash",
      pct(breakeven_p(multiple=v("givewell_bar")), 1))
    r(s, "Cost per transformational firm",
      f"{usd(m['cost_total'])} ÷ {num(m['n_transform'], 1)}", usd(m["cost_per_transform"]))
    return rows


def write_csv() -> Path:
    """The same calculation as a spreadsheet, openable in Sheets or Excel."""
    import csv
    path = DOCS / "concept-note-model.csv"
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["Business Simulator — cost-effectiveness model"])
        w.writerow(["Generated by scripts/build-concept-note.py. Do not edit by hand."])
        w.writerow([])
        w.writerow(["INPUTS"])
        w.writerow(["Parameter", "Value", "Source", "Note"])
        for p in PARAMS.values():
            w.writerow([p.label, p.shown(), p.source, p.note])
        w.writerow([])
        w.writerow(["CALCULATION"])
        w.writerow(["Section", "Step", "Formula", "Value"])
        for row in derivation():
            w.writerow(list(row))
        w.writerow([])
        w.writerow(["SENSITIVITY — benefit/cost ratio across each parameter's range"])
        w.writerow(["Parameter", "Low", "Ratio at low", "High", "Ratio at high", "Swing"])
        for key, lo_r, hi_r, swing in tornado():
            lo, hi = RANGES[key]
            w.writerow([PARAMS[key].label, lo, f"{lo_r:.3f}", hi, f"{hi_r:.3f}", f"{swing:.3f}"])
    return path


def scenarios() -> list[tuple[str, float, float, str]]:
    """A cumulative ladder from the most conservative reading to the base case.

    Adding benefit categories is the easiest way to make any programme look good, so the
    discipline is to show the ladder rather than the destination. Each rung turns on one
    component; a reader who does not believe a rung can stop reading at the one below it
    and take that number instead.
    """
    off = {
        "job_growth": 0.0, "survival_t": 1.0, "horizon_t": 6,
        "owner_ratio": 0.0, "tax_ratio": 0.0, "supplier_ratio": 0.0,
        "gain_other_funded": 200, "survival_o": 1.0, "horizon_o": 3,
        "displacement_o": 0.30, "gain_per_learner": 0.0,
    }
    rungs: list[tuple[str, dict, str]] = [
        ("Wages only, and they stop after 6 years", {},
         "The original reading. A fixed wage bill for a fixed period, nothing else."),
        ("+ the firm survives and grows",
         {"job_growth": v("job_growth"), "survival_t": v("survival_t"),
          "horizon_t": v("horizon_t")},
         "A hard cut-off is the wrong shape. Survival decays the stream; growth is what "
         "'transformational' means."),
        ("+ the owner's own income", {"owner_ratio": v("owner_ratio")},
         "Previously counted at zero, which is plainly wrong."),
        ("+ tax paid once formal", {"tax_ratio": v("tax_ratio")},
         "Valued at par with private income by default. Set public_value to 0 to drop it."),
        ("+ local suppliers", {"supplier_ratio": v("supplier_ratio")},
         "Backward linkages. The most arguable rung on the ladder."),
        ("+ livelihood firms are not just cash",
         {"gain_other_funded": v("gain_other_funded"), "survival_o": v("survival_o"),
          "horizon_o": v("horizon_o"), "displacement_o": v("displacement_o")},
         "Capital that stays in a trading business, in firms that passed a filter and "
         "wrote a forecast."),
        ("+ learning among those who get nothing",
         {"gain_per_learner": v("gain_per_learner")},
         "Tiny per head, ~1,000 heads, and genuinely unmeasured."),
    ]
    out: list[tuple[str, float, float, str]] = []
    cumulative = dict(off)
    for label, turn_on, why in rungs:
        cumulative.update(turn_on)
        r = model(dict(cumulative))
        out.append((label, r["ratio"], r["cash_multiple"], why))
    return out


# sensitivity ranges: (low, high) — plausible, not ±x%
RANGES: dict[str, tuple[float, float]] = {
    "p_transform": (0.02, 0.12),
    "jobs_initial": (2, 10),
    "job_growth": (0.0, 0.25),
    "survival_t": (0.80, 0.97),
    "income_per_job": (400, 900),
    "horizon_t": (8, 20),
    "owner_ratio": (0.0, 0.60),
    "tax_ratio": (0.0, 0.50),
    "supplier_ratio": (0.0, 0.60),
    "counterfactual": (0.70, 0.30),   # reversed: higher counterfactual is worse
    "displacement": (0.40, 0.05),
    "gain_other_funded": (200, 700),
    "survival_o": (0.70, 0.93),
    "ch1_completion": (0.20, 0.50),
    "application_rate": (0.10, 0.35),
    "recruit_per_start": (5.00, 0.50),
    "platform_build": (40000, 15000),
    "gain_per_learner": (0, 30),
}


def tornado() -> list[tuple[str, float, float, float]]:
    base = model()["ratio"]
    rows = []
    for key, (lo, hi) in RANGES.items():
        r_lo = model({key: lo})["ratio"]
        r_hi = model({key: hi})["ratio"]
        rows.append((key, r_lo, r_hi, abs(r_hi - r_lo)))
    rows.sort(key=lambda r: r[3], reverse=True)
    return rows


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

def usd(x: float, dp: int = 0) -> str:
    return f"${x:,.{dp}f}"


def num(x: float, dp: int = 0) -> str:
    return f"{x:,.{dp}f}"


def pct(x: float, dp: int = 1) -> str:
    return f"{x * 100:.{dp}f}%"


def esc(s: str) -> str:
    return html.escape(str(s), quote=True)


