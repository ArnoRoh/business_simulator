#!/usr/bin/env python3
"""Build the cost-effectiveness workbook at docs/concept-note-model.xlsx.

    python3 scripts/build-model-xlsx.py

Structured after GiveWell's published cost-effectiveness models: inputs separated from
calculation, every intermediate step visible, adjustments applied explicitly and named,
and the result expressed as a multiple of the unconditional-cash benchmark against
their stated funding bar.

**Every value in the Calculation and Results sheets is a live formula** pointing back at
the Inputs sheet. Change a shaded input cell and the whole model recalculates — that is
the point of shipping a workbook rather than a table of numbers.

The arithmetic is imported from `lib/cea_model.py`, the same module that generates the
HTML note, so the two can never disagree.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

import xlsx  # noqa: E402
from xlsx import Cell, Sheet  # noqa: E402
from cea_model import PARAMS, RANGES, annuity, model, scenarios, tornado, v  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "concept-note-model.xlsx"

FMT_STYLE = {
    "usd": xlsx.S_MONEY, "usd2": xlsx.S_MONEY2, "usd4": xlsx.S_MONEY2,
    "pct": xlsx.S_PCT, "years": xlsx.S_NUM, "num": xlsx.S_NUM, "mult": xlsx.S_MULT,
}


class Builder:
    """Tracks where each computed line landed, so later formulas can point at it."""

    def __init__(self, sheet: Sheet):
        self.sh = sheet
        self.ref: dict[str, str] = {}

    def line(self, key: str | None, step: str, formula: str, value: float,
             style: int = xlsx.S_MONEY, note: str = "") -> str:
        self.sh.row(Cell(step), Cell(formula, xlsx.S_NOTE),
                    Cell(value, style, formula=formula if formula.startswith(("=",)) else None),
                    Cell(note, xlsx.S_NOTE))
        # rewrite the value cell properly: formula text lives in col B for humans,
        # the live formula in col C
        r = len(self.sh.rows)
        ref = f"C{r}"
        if key:
            self.ref[key] = ref
        return ref

    def calc(self, key: str | None, step: str, formula: str, value: float,
             style: int = xlsx.S_MONEY, note: str = "") -> str:
        """A row whose C cell is a live formula (given without the leading '=')."""
        self.sh.row(Cell(step), Cell("= " + formula, xlsx.S_NOTE),
                    Cell(value, style, formula=formula), Cell(note, xlsx.S_NOTE))
        r = len(self.sh.rows)
        ref = f"C{r}"
        if key:
            self.ref[key] = ref
        return ref

    def section(self, title: str) -> None:
        self.sh.blank()
        self.sh.row(Cell(title, xlsx.S_SECTION), Cell("", xlsx.S_SECTION),
                    Cell("", xlsx.S_SECTION), Cell("", xlsx.S_SECTION))


def build() -> Path:
    m = model()
    d = v("discount")

    # ---------------------------------------------------------------- Read me
    readme = Sheet("Read me", widths=[104])
    readme.row(Cell("Business Simulator — cost-effectiveness model", xlsx.S_TITLE))
    readme.blank()
    for para in [
        "A staged selection pipeline that uses a free, offline business simulator as a "
        "first-stage filter, a forecast-style business plan as the second, and a "
        "six-month review of forecast against actual as the third.",
        "",
        "READ THIS FIRST. No part of this pipeline has been run. The simulator exists "
        "and is playable; the portal, the backend and the AI marking do not. Every "
        "behavioural rate here — how many finish, how many apply, how many firms "
        "transform — is a guess with no data behind it. The model is here to show what "
        "the answer depends on, not to claim a result.",
        "",
        "HOW TO USE IT. Shaded cells on the Inputs sheet are the only things to change. "
        "Everything on Calculation and Results is a live formula; edit an input and the "
        "whole model moves. Nothing is hardcoded except the inputs themselves.",
        "",
        "SOURCE TAGS, on every input:",
        "    owner       — stated by the project owner and recorded in the decision log.",
        "    sourced     — taken from a named external source, cited in the note column.",
        "    assumption  — chosen to make the model run. No evidence behind it.",
        "    unverified  — recalled from the literature and NOT checked against a source.",
        "                  Do not repeat these as fact.",
        "",
        "BENCHMARK. Following GiveWell, cost-effectiveness is expressed as a multiple of "
        "unconditional cash transfers to people in poverty. GiveWell's stated funding "
        f"bar is {v('givewell_bar'):g}× that benchmark. Both are on the Results sheet.",
        "",
        "GiveWell's own caveat applies with more force here than it does to them: these "
        "estimates are extremely rough and should not be taken literally. They are for "
        "comparing options, not for predicting outcomes.",
        "",
        "Generated by scripts/build-model-xlsx.py. Do not edit this workbook by hand — "
        "regenerate it. The same arithmetic generates docs/concept-note.html.",
    ]:
        readme.row(Cell(para, xlsx.S_WRAP))

    # ---------------------------------------------------------------- Inputs
    inp = Sheet("Inputs", widths=[56, 14, 13, 62], freeze="A3")
    inp.row(Cell("Inputs — shaded cells are the ones to change", xlsx.S_TITLE))
    inp.row(Cell("Parameter", xlsx.S_HEAD), Cell("Value", xlsx.S_HEAD),
            Cell("Source", xlsx.S_HEAD), Cell("Note", xlsx.S_HEAD))
    iref: dict[str, str] = {}
    for key, p in PARAMS.items():
        inp.row(Cell(p.label), Cell(p.value, xlsx.S_INPUT), Cell(p.source),
                Cell(p.note, xlsx.S_NOTE))
        iref[key] = f"Inputs!B{len(inp.rows)}"
    # number formats can't vary per-cell with one style index, so widen the value column
    # and let the source tag carry the unit; the label already names it.

    # ------------------------------------------------------------ Calculation
    calc = Sheet("Calculation", widths=[46, 44, 16, 46], freeze="A3")
    calc.row(Cell("Calculation — every step, live", xlsx.S_TITLE))
    calc.row(Cell("Step", xlsx.S_HEAD), Cell("Formula", xlsx.S_HEAD),
             Cell("Value", xlsx.S_HEAD), Cell("Note", xlsx.S_HEAD))
    b = Builder(calc)
    I = iref

    b.section("1 · Funnel")
    b.calc("starts", "People reached", f"{I['starts']}", m["starts"], xlsx.S_NUM)
    b.calc("finishers", "Finish chapter 1",
           f"{b.ref['starts']}*{I['ch1_completion']}", m["finishers"], xlsx.S_NUM)
    b.calc("applicants", "Submit a forecast through the portal",
           f"{b.ref['finishers']}*{I['application_rate']}", m["applicants"], xlsx.S_NUM)
    b.calc("funded", "Funded", f"MIN({I['grants']},{b.ref['applicants']})",
           m["funded"], xlsx.S_NUM)
    b.calc("selratio", "Selection ratio",
           f"{b.ref['funded']}/{b.ref['applicants']}", m["selection_ratio"], xlsx.S_PCT)
    b.calc("unfunded", "Finishers who receive nothing",
           f"{b.ref['finishers']}-{b.ref['funded']}", m["unfunded_finishers"], xlsx.S_NUM)

    b.section("2 · Cost")
    b.calc("c_grants", "Grants", f"{b.ref['funded']}*{I['grant_size']}", m["grants_total"])
    b.calc("c_recruit", "Recruitment", f"{b.ref['starts']}*{I['recruit_per_start']}",
           m["recruitment"])
    b.calc("c_review", "Six-month reviews", f"{b.ref['funded']}*{I['review_per_funded']}",
           m["reviews"])
    b.calc("c_host", "Hosting", f"{I['hosting_per_cohort']}", m["hosting"])
    b.calc("c_build", "Platform build (one-off)", f"{I['platform_build']}", m["platform"],
           note="AI-built, not a dev team.")
    b.calc("c_mark", "AI marking", f"{b.ref['applicants']}*{I['judge_per_plan']}",
           m["judging"], xlsx.S_MONEY2)
    b.calc("c_sub", "Subtotal",
           f"SUM({b.ref['c_grants']}:{b.ref['c_mark']})", m["cost_total"] - m["admin"])
    b.calc("c_admin", "Administration", f"{b.ref['c_sub']}*{I['admin_rate']}", m["admin"])
    b.calc("COST", "TOTAL COST", f"{b.ref['c_sub']}+{b.ref['c_admin']}", m["cost_total"],
           xlsx.S_MONEY)

    b.section("3 · Benefit — transformational firms")
    b.calc("n_tr", "Transformational firms", f"{b.ref['funded']}*{I['p_transform']}",
           m["n_transform"], xlsx.S_NUM1)
    b.calc("wage1", "Wage bill, year 1",
           f"{I['jobs_initial']}*{I['income_per_job']}", m["wage_bill_y1"])
    b.calc("pvf_t", "PV factor — grows, survives, bounded by the horizon",
           f"(1/(1+{I['discount']}))*(1-(((1+{I['job_growth']})*{I['survival_t']}"
           f"/(1+{I['discount']}))^{I['horizon_t']}))/(1-((1+{I['job_growth']})"
           f"*{I['survival_t']}/(1+{I['discount']})))",
           m["pvf_t"], xlsx.S_NUM1,
           note="Growth and survival together, rather than a hard cut-off year.")
    b.calc("pv_w", "PV of wages", f"{b.ref['wage1']}*{b.ref['pvf_t']}", m["pv_wages"])
    b.calc("pv_o", "+ owner's own net income",
           f"{b.ref['pv_w']}*{I['owner_ratio']}", m["pv_owner"])
    b.calc("pv_t", "+ tax paid once formal",
           f"{b.ref['pv_w']}*{I['tax_ratio']}*{I['public_value']}", m["pv_tax"],
           note="Set public_value to 0 to exclude tax entirely.")
    b.calc("pv_s", "+ local supplier income",
           f"{b.ref['pv_w']}*{I['supplier_ratio']}", m["pv_supplier"])
    b.calc("gross_t", "Gross PV per firm",
           f"{b.ref['pv_w']}+{b.ref['pv_o']}+{b.ref['pv_t']}+{b.ref['pv_s']}",
           m["pv_gross_t"])
    b.calc("net_t", "less displacement and counterfactual",
           f"{b.ref['gross_t']}*(1-{I['displacement']})*(1-{I['counterfactual']})",
           m["pv_per_transform"])
    b.calc("S3", "STREAM TOTAL", f"{b.ref['n_tr']}*{b.ref['net_t']}", m["benefit_transform"])

    b.section("4 · Benefit — other funded firms")
    b.calc("n_ot", "Firms", f"{b.ref['funded']}-{b.ref['n_tr']}",
           m["funded"] - m["n_transform"], xlsx.S_NUM1)
    b.calc("pvf_o", "PV factor — survives, bounded by the horizon",
           f"(1/(1+{I['discount']}))*(1-(({I['survival_o']}/(1+{I['discount']}))"
           f"^{I['horizon_o']}))/(1-({I['survival_o']}/(1+{I['discount']})))",
           m["pvf_o"], xlsx.S_NUM1)
    b.calc("S4", "STREAM TOTAL",
           f"{b.ref['n_ot']}*{I['gain_other_funded']}*{b.ref['pvf_o']}"
           f"*(1-{I['displacement_o']})*(1-{I['counterfactual_other']})",
           m["benefit_other"], note="Not a cash transfer: selection plus discipline.")

    b.section("5 · Benefit — learning, among finishers who get nothing")
    b.calc("pvf_l", "PV factor",
           f"(1-(1+{I['discount']})^-{I['years_learner']})/{I['discount']}",
           annuity(v("years_learner"), d), xlsx.S_NUM1)
    b.calc("S5", "STREAM TOTAL",
           f"{b.ref['unfunded']}*{I['gain_per_learner']}*{b.ref['pvf_l']}"
           f"*{I['learner_haircut']}", m["benefit_learning"],
           note="Large N, tiny per head, genuinely unmeasured.")

    b.section("6 · Cash benchmark")
    b.calc("pvf_c", "PV factor",
           f"(1-(1+{I['discount']})^-{I['cash_years']})/{I['discount']}",
           annuity(v("cash_years"), d), xlsx.S_NUM1)
    b.calc("CASH", "PV income per $1 of unconditional cash",
           f"{I['cash_gain_annual']}*{b.ref['pvf_c']}/1000", m["cash_pv_per_dollar"],
           xlsx.S_NUM1, note="Benchmark. Input is unverified.")

    b.section("7 · Result")
    b.calc("BEN", "Total PV benefit",
           f"{b.ref['S3']}+{b.ref['S4']}+{b.ref['S5']}", m["benefit_total"])
    b.calc("RATIO", "PV income per $1 spent", f"{b.ref['BEN']}/{b.ref['COST']}",
           m["ratio"], xlsx.S_NUM1)
    b.calc("MULT", "Multiple of unconditional cash", f"{b.ref['RATIO']}/{b.ref['CASH']}",
           m["cash_multiple"], xlsx.S_MULT)

    floor = m["benefit_other"] + m["benefit_learning"]
    be1 = ((m["cash_pv_per_dollar"] * m["cost_total"]) - floor) / m["pv_per_transform"] / m["funded"]
    beb = ((m["cash_pv_per_dollar"] * v("givewell_bar") * m["cost_total"]) - floor) \
        / m["pv_per_transform"] / m["funded"]
    b.calc("BE1", "Hit rate needed to match cash",
           f"(({b.ref['CASH']}*{b.ref['COST']})-({b.ref['S4']}+{b.ref['S5']}))"
           f"/{b.ref['net_t']}/{b.ref['funded']}", be1, xlsx.S_PCT,
           note="Holds the other two streams at their base values.")
    b.calc("BEB", f"Hit rate needed to clear the {v('givewell_bar'):g}× bar",
           f"(({b.ref['CASH']}*{I['givewell_bar']}*{b.ref['COST']})"
           f"-({b.ref['S4']}+{b.ref['S5']}))/{b.ref['net_t']}/{b.ref['funded']}",
           beb, xlsx.S_PCT)
    b.calc("CPT", "Cost per transformational firm",
           f"{b.ref['COST']}/{b.ref['n_tr']}", m["cost_per_transform"])

    # --------------------------------------------------------------- Results
    res = Sheet("Results", widths=[52, 18, 60])
    res.row(Cell("Results", xlsx.S_TITLE))
    res.row(Cell("Output", xlsx.S_HEAD), Cell("Value", xlsx.S_HEAD), Cell("Reading", xlsx.S_HEAD))
    R = b.ref

    def out(label, ref, val, style, reading):
        res.row(Cell(label, xlsx.S_RESULT),
                Cell(val, style, formula=f"Calculation!{ref}"),
                Cell(reading, xlsx.S_NOTE))

    out("Total cost of the pilot", R["COST"], m["cost_total"], xlsx.S_MONEY,
        f"Of which {m['grants_total'] / m['cost_total']:.0%} reaches founders as cash.")
    out("Total PV benefit", R["BEN"], m["benefit_total"], xlsx.S_MONEY,
        "Three streams: transformational firms, other funded firms, learning.")
    out("PV income per $1 spent", R["RATIO"], m["ratio"], xlsx.S_NUM1, "")
    out("Unconditional cash benchmark", R["CASH"], m["cash_pv_per_dollar"], xlsx.S_NUM1,
        "PV income per $1 of cash handed over. Input is unverified.")
    out("MULTIPLE OF CASH", R["MULT"], m["cash_multiple"], xlsx.S_MULT,
        "The headline number, in GiveWell's units.")
    res.row(Cell("GiveWell funding bar", xlsx.S_RESULT),
            Cell(v("givewell_bar"), xlsx.S_MULT, formula=f"{iref['givewell_bar']}"),
            Cell("Their stated bar for making a grant, as of May 2026.", xlsx.S_NOTE))
    out("Hit rate needed to match cash", R["BE1"], be1, xlsx.S_PCT,
        "Share of funded firms that must become transformational.")
    out(f"Hit rate needed to clear {v('givewell_bar'):g}×", R["BEB"], beb, xlsx.S_PCT,
        "The honest test. Compare against what you believe is achievable.")
    out("Cost per transformational firm", R["CPT"], m["cost_per_transform"], xlsx.S_MONEY, "")
    res.blank()
    res.row(Cell("What this says", xlsx.S_SECTION), Cell("", xlsx.S_SECTION),
            Cell("", xlsx.S_SECTION))
    for line in [
        f"At the base-case hit rate of {v('p_transform'):.0%}, the pipeline lands at "
        f"{m['cash_multiple']:.2f}× unconditional cash. It matches cash at a "
        f"{be1:.1%} hit rate and would need {beb:.0%} to clear GiveWell's bar.",
        "",
        "The sensitivity sheet is the real finding: the result is dominated by the hit "
        "rate and by jobs per firm. Recruitment cost, completion rate and the platform "
        "build barely move it. This is a venture portfolio, not a service-delivery "
        "programme, and it should be argued for and evaluated as one.",
        "",
        "The pilot's largest output is not the firms funded. It is the only dataset that "
        "could ever tell you what the hit rate actually is — which is worth far more than "
        "one cohort's direct benefit, and is destroyed if every grant goes to the "
        "highest-ranked applicant.",
    ]:
        res.row(Cell(line, xlsx.S_WRAP))

    # ----------------------------------------------------------- Sensitivity
    sens = Sheet("Sensitivity", widths=[52, 13, 13, 14, 14, 12], freeze="A3")
    sens.row(Cell("Sensitivity — one parameter at a time, across its plausible range",
                  xlsx.S_TITLE))
    sens.row(Cell("Parameter", xlsx.S_HEAD), Cell("Low", xlsx.S_HEAD),
             Cell("High", xlsx.S_HEAD), Cell("Ratio at low", xlsx.S_HEAD),
             Cell("Ratio at high", xlsx.S_HEAD), Cell("Swing", xlsx.S_HEAD))
    for key, r_lo, r_hi, swing in tornado():
        lo, hi = RANGES[key]
        sens.row(Cell(PARAMS[key].label), Cell(lo, xlsx.S_NUM1), Cell(hi, xlsx.S_NUM1),
                 Cell(round(r_lo, 3), xlsx.S_NUM1), Cell(round(r_hi, 3), xlsx.S_NUM1),
                 Cell(round(swing, 3), xlsx.S_NUM1))
    sens.blank()
    sens.row(Cell("These columns are static values, not formulas: each one requires "
                  "re-running the whole model with a single input changed, which a "
                  "spreadsheet cannot express in one cell. To check any row by hand, "
                  "change that input on the Inputs sheet and read the Results sheet.",
                  xlsx.S_WRAP))

    # -------------------------------------------------------------- Ladder
    lad = Sheet("Ladder", widths=[50, 13, 12, 62])
    lad.row(Cell("How much of the benefit is counted", xlsx.S_TITLE))
    lad.row(Cell("Each row adds one component to the row above it.", xlsx.S_NOTE))
    lad.row(Cell("What is counted", xlsx.S_HEAD), Cell("PV per $1", xlsx.S_HEAD),
            Cell("× cash", xlsx.S_HEAD), Cell("Why", xlsx.S_HEAD))
    for label, ratio, mult, why in scenarios():
        lad.row(Cell(label), Cell(round(ratio, 3), xlsx.S_NUM1),
                Cell(round(mult, 2), xlsx.S_MULT), Cell(why, xlsx.S_NOTE))
    lad.blank()
    lad.row(Cell("Adding benefit categories is the easiest way to make any programme look "
                 "good. None of these components is measured. A reader who does not accept "
                 "a row can stop at the row above it and take that number instead — which "
                 "is why the ladder is here rather than only the final figure. These are "
                 "static values: each requires re-running the model with several inputs "
                 "changed at once.", xlsx.S_WRAP))

    return xlsx.write(OUT, [readme, inp, calc, res, lad, sens])


if __name__ == "__main__":
    p = build()
    m = model()
    print(f"wrote {p.relative_to(ROOT)}  ({p.stat().st_size / 1024:.1f} KB)")
    print(f"  total cost      ${m['cost_total']:,.0f}")
    print(f"  PV benefit      ${m['benefit_total']:,.0f}")
    print(f"  multiple        {m['cash_multiple']:.2f}x cash "
          f"(bar {v('givewell_bar'):g}x)")
