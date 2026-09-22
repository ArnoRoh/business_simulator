#!/usr/bin/env python3
"""Verify generated documents; compare workbook members, not ZIP timestamps."""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import subprocess
root = Path(__file__).resolve().parent.parent
files = ['docs/concept-note.html', 'docs/concept-note-model.csv', 'docs/concept-note-model.xlsx', 'app/standalone.html', 'app/intro-standalone.html']
def content(path):
    data = (root / path).read_bytes()
    if path.endswith('.xlsx'):
        with ZipFile(BytesIO(data)) as book:
            return {name: book.read(name) for name in book.namelist()}
    return data
before = {path: content(path) for path in files}
for command in [['python3', 'scripts/build-concept-note.py'], ['python3', 'scripts/build-model-xlsx.py'], ['node', 'scripts/build-single-file.mjs'], ['node', 'scripts/build-single-file.mjs', '--entry']]:
    subprocess.run(command, cwd=root, check=True, stdout=subprocess.DEVNULL)
for path in files:
    assert before[path] == content(path), f'{path} was stale; review and keep the regenerated output'
print('Generated documents and standalone are fresh')
