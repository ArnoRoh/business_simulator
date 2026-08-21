#!/usr/bin/env python3
"""Check that the generated workbook's live formulas reproduce the Python model.

    python3 scripts/check-model.py

The workbook at `docs/concept-note-model.xlsx` carries real formulas so a reader can
change an input and watch the answer move. That is only worth having if the formula
graph actually computes what `lib/cea_model.py` computes — and nothing else in this
repository would notice if it drifted, because no Excel exists here to open the file.

So this evaluates the workbook's formulas independently, in Python, from the XML alone,
and compares the results against the model. It also checks the parts that are cheap to
get wrong: well-formed XML, style counts matching their declared totals, and every
formula reference pointing at a cell that exists.

Exit code 1 on any failure. Run it after touching either builder.
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "lib"))

from cea_model import model, v  # noqa: E402

BOOK = ROOT / "docs" / "concept-note-model.xlsx"
M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

passed = failed = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  ok   {label}" + (f"  {detail}" if detail else ""))
    else:
        failed += 1
        print(f"  FAIL {label}  {detail}")


class Book:
    """Just enough of a spreadsheet engine to evaluate what this workbook contains."""

    FUNCS = {"SUM": "(", "MIN": "min("}

    def __init__(self, path: Path):
        self.z = zipfile.ZipFile(path)
        self.names = [s.get("name") for s in
                      ET.fromstring(self.z.read("xl/workbook.xml")).iter(M + "sheet")]
        self.literal: dict[str, float] = {}
        self.formula: dict[str, tuple[str, str]] = {}
        self.labels: dict[str, list[str]] = {}
        self.defined: dict[str, set[str]] = {}
        for i, nm in enumerate(self.names, 1):
            root = ET.fromstring(self.z.read(f"xl/worksheets/sheet{i}.xml"))
            self.defined[nm] = set()
            for c in root.iter(M + "c"):
                r = c.get("r")
                self.defined[nm].add(r)
                key = f"{nm}!{r}"
                f, val = c.find(M + "f"), c.find(M + "v")
                text = c.find(M + "is/" + M + "t")
                if f is not None and f.text:
                    self.formula[key] = (nm, f.text)
                elif val is not None and c.get("t") is None:
                    self.literal[key] = float(val.text)
                if text is not None and re.sub(r"\d", "", r) == "A":
                    self.labels.setdefault(text.text, []).append(
                        f"{nm}!C{re.sub(r'[^0-9]', '', r)}")
        self.cache: dict[str, float] = {}

    def ev(self, key: str) -> float:
        if key in self.cache:
            return self.cache[key]
        if key in self.literal:
            return self.literal[key]
        sheet, src = self.formula[key]
        e = re.sub(r"([A-Z]{1,2})(\d+):\1(\d+)",
                   lambda m: "(" + "+".join(f"@{m.group(1)}{r}@"
                                            for r in range(int(m.group(2)),
                                                           int(m.group(3)) + 1)) + ")", src)
        e = e.replace("SUM(", "(").replace("MIN(", "min(")
        e = re.sub(r"@([A-Z]{1,2}\d+)@", lambda m: f"E('{sheet}!{m.group(1)}')", e)
        e = re.sub(r"(?<![\w!'])((?:[A-Za-z ]+)!)?(\$?[A-Z]{1,2}\$?\d+)(?![\w(])",
                   lambda m: "E('%s!%s')" % (
                       (m.group(1) or sheet + "!").rstrip("!").strip(),
                       m.group(2).replace("$", "")), e)
        val = eval(e.replace("^", "**"), {"E": self.ev, "min": min})  # noqa: S307
        self.cache[key] = val
        return val

    def by_label(self, label: str, nth: int = 0) -> float:
        return self.ev(self.labels[label][nth])


def main() -> int:
    if not BOOK.exists():
        print(f"FAIL: {BOOK.relative_to(ROOT)} does not exist — "
              "run scripts/build-model-xlsx.py first")
        return 1

    print(f"workbook: {BOOK.relative_to(ROOT)}\n")
    z = zipfile.ZipFile(BOOK)

    print("structure")
    check("zip integrity", z.testzip() is None)
    for n in z.namelist():
        try:
            ET.fromstring(z.read(n))
        except ET.ParseError as exc:
            check(f"XML parses: {n}", False, str(exc))
            return 1
    check("every XML part parses", True, f"{len(z.namelist())} parts")

    styles = ET.fromstring(z.read("xl/styles.xml"))
    ns = {"m": M[1:-1]}
    for tag in ("fonts", "fills", "borders", "cellXfs"):
        el = styles.find(f"m:{tag}", ns)
        check(f"styles: {tag} count matches", str(len(list(el))) == el.get("count"),
              f'declared {el.get("count")}, actual {len(list(el))}')

    book = Book(BOOK)
    expected_sheets = ["Read me", "Inputs", "Calculation", "Results", "Ladder",
                       "Sensitivity"]
    check("sheets present", book.names == expected_sheets, ", ".join(book.names))

    dangling = 0
    for key, (sheet, src) in book.formula.items():
        for m in re.finditer(r"(?:(?P<sh>[A-Za-z ]+)!)?(?P<ref>\$?[A-Z]{1,2}\$?\d+)", src):
            sh = (m.group("sh") or sheet).strip()
            ref = m.group("ref").replace("$", "")
            if sh not in book.defined or ref not in book.defined[sh]:
                print(f"       dangling {sh}!{ref} from {key}")
                dangling += 1
    check("no dangling formula references", dangling == 0,
          f"{len(book.formula)} formulas")

    print("\nformulas reproduce lib/cea_model.py")
    mdl = model()
    for label, expected, nth in [
        ("TOTAL COST", mdl["cost_total"], 0),
        ("Total PV benefit", mdl["benefit_total"], 0),
        ("PV income per $1 spent", mdl["ratio"], 0),
        ("Multiple of unconditional cash", mdl["cash_multiple"], 0),
        ("PV income per $1 of unconditional cash", mdl["cash_pv_per_dollar"], 0),
        ("STREAM TOTAL", mdl["benefit_transform"], 0),
        ("STREAM TOTAL", mdl["benefit_other"], 1),
        ("STREAM TOTAL", mdl["benefit_learning"], 2),
        ("Cost per transformational firm", mdl["cost_per_transform"], 0),
        ("Selection ratio", mdl["selection_ratio"], 0),
    ]:
        got = book.by_label(label, nth)
        tol = max(1e-6, abs(expected) * 1e-9)
        check(f"{label}{f' #{nth + 1}' if nth else ''}", abs(got - expected) <= tol,
              f"{got:,.4f} vs {expected:,.4f}")

    print("\nthe headline claim")
    mult = book.by_label("Multiple of unconditional cash")
    bar = v("givewell_bar")
    print(f"  {mult:.2f}x unconditional cash, against a stated funding bar of {bar:g}x")

    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
