"""A minimal .xlsx writer, stdlib only.

An xlsx file is a zip of XML parts. This writes the smallest subset that supports what
a cost-effectiveness model needs and nothing more: several sheets, inline strings, live
formulas with cached values, a handful of styles, column widths and frozen panes.

Why not openpyxl: this environment has an externally-managed Python and the repository
is deliberately dependency-free (ADR-0006). A model nobody can regenerate is worse than
no model.

**Formulas carry a cached value.** Excel, LibreOffice and Google Sheets all recalculate
on load, but a cached value means the workbook also displays correctly in previewers
that do not. The formula is the source of truth; the cache is a courtesy.
"""

from __future__ import annotations

import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from xml.sax.saxutils import escape

# Style indices, in the order they are written into styles.xml below.
S_DEFAULT = 0
S_TITLE = 1
S_HEAD = 2
S_SECTION = 3
S_INPUT = 4        # editable cells — filled, so a reader knows what to change
S_MONEY = 5
S_MONEY2 = 6
S_PCT = 7
S_NUM = 8
S_NUM1 = 9
S_MULT = 10
S_NOTE = 11
S_RESULT = 12      # headline outputs — bold, boxed
S_WRAP = 13


@dataclass
class Cell:
    value: object = None          # str | float | int | None
    style: int = S_DEFAULT
    formula: str | None = None    # without the leading '='


@dataclass
class Sheet:
    name: str
    rows: list[list[Cell]] = field(default_factory=list)
    widths: list[float] = field(default_factory=list)
    freeze: str | None = None     # e.g. "A2"

    def row(self, *cells: Cell | str | float | None) -> None:
        out: list[Cell] = []
        for c in cells:
            out.append(c if isinstance(c, Cell) else Cell(c))
        self.rows.append(out)

    def blank(self, n: int = 1) -> None:
        for _ in range(n):
            self.rows.append([])

    def ref(self, row_index: int, col_index: int) -> str:
        """A1-style reference. Both indices are 0-based; row 0 is spreadsheet row 1."""
        return f"{col_letter(col_index)}{row_index + 1}"


def col_letter(i: int) -> str:
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


_CT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
{sheets}</Types>"""

_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

# fullCalcOnLoad makes every consumer recompute the formulas rather than trust the cache.
_WB = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>{sheets}</sheets>
<calcPr calcId="0" fullCalcOnLoad="1"/>
</workbook>"""

_STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0"/>
<numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/>
<numFmt numFmtId="166" formatCode="0.0%"/>
<numFmt numFmtId="167" formatCode="0.00&quot;×&quot;"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF767676"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><name val="Calibri"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2A78D6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF3D6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDF3FC"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyBorder="1" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
</cellXfs>
</styleSheet>"""


def _cell_xml(ref: str, c: Cell) -> str:
    if c.formula is not None:
        cached = ""
        if isinstance(c.value, (int, float)):
            cached = f"<v>{c.value!r}</v>" if isinstance(c.value, float) else f"<v>{c.value}</v>"
        return f'<c r="{ref}" s="{c.style}"><f>{escape(c.formula)}</f>{cached}</c>'
    if c.value is None or c.value == "":
        return f'<c r="{ref}" s="{c.style}"/>' if c.style else ""
    if isinstance(c.value, bool):
        return f'<c r="{ref}" s="{c.style}" t="b"><v>{int(c.value)}</v></c>'
    if isinstance(c.value, (int, float)):
        return f'<c r="{ref}" s="{c.style}"><v>{c.value}</v></c>'
    return (f'<c r="{ref}" s="{c.style}" t="inlineStr">'
            f'<is><t xml:space="preserve">{escape(str(c.value))}</t></is></c>')


def _sheet_xml(sh: Sheet) -> str:
    parts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">']
    if sh.freeze:
        parts.append(
            '<sheetViews><sheetView workbookViewId="0">'
            f'<pane ySplit="{int(sh.freeze[1:]) - 1}" topLeftCell="{sh.freeze}" '
            'activePane="bottomLeft" state="frozen"/>'
            '</sheetView></sheetViews>')
    if sh.widths:
        cols = "".join(
            f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>'
            for i, w in enumerate(sh.widths))
        parts.append(f"<cols>{cols}</cols>")
    parts.append("<sheetData>")
    for ri, row in enumerate(sh.rows):
        if not row:
            continue
        cells = "".join(_cell_xml(f"{col_letter(ci)}{ri+1}", c) for ci, c in enumerate(row))
        if cells:
            parts.append(f'<row r="{ri+1}">{cells}</row>')
    parts.append("</sheetData></worksheet>")
    return "".join(parts)


def write(path: Path, sheets: list[Sheet]) -> Path:
    ct_overrides = "".join(
        f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(len(sheets)))
    wb_sheets = "".join(
        f'<sheet name="{escape(s.name)}" sheetId="{i+1}" r:id="rId{i+1}"/>'
        for i, s in enumerate(sheets))
    wb_rels = "".join(
        f'<Relationship Id="rId{i+1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        f'Target="worksheets/sheet{i+1}.xml"/>'
        for i in range(len(sheets)))
    wb_rels += (f'<Relationship Id="rId{len(sheets)+1}" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
                'Target="styles.xml"/>')

    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", _CT.format(sheets=ct_overrides))
        z.writestr("_rels/.rels", _RELS)
        z.writestr("xl/workbook.xml", _WB.format(sheets=wb_sheets))
        z.writestr("xl/_rels/workbook.xml.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   f"{wb_rels}</Relationships>")
        z.writestr("xl/styles.xml", _STYLES)
        for i, sh in enumerate(sheets):
            z.writestr(f"xl/worksheets/sheet{i+1}.xml", _sheet_xml(sh))
    return path
