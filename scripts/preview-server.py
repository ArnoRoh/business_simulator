#!/usr/bin/env python3
"""Preview server: serves app/ like `python3 -m http.server`, and accepts opt-in,
anonymous progress reports at /telemetry (D-068).

A report keeps only whitelisted progress fields. The server adds a UTC time to the
minute. It stores no IP address, headers or free text. GET /telemetry answers 204 so
the game knows this host accepts reports; hosts without this server (GitHub Pages)
answer 404 and the game never asks.

Run:    python3 scripts/preview-server.py 8769
Check:  python3 scripts/preview-server.py --selftest
Data:   $XDG_DATA_HOME/business-simulator/telemetry.jsonl (outside the repository)
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / 'app'
DATA = Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local/share') / 'business-simulator' / 'telemetry.jsonl'
STEPS = {'open', 'guide', 'trade', 'event', 'review', 'panel', 'finished', 'closed', 'newRun'}
WORD = re.compile(r'^[\w.-]{1,40}$', re.ASCII)
FIELDS = {'id', 'step', 'week', 'run', 'detail', 'lang', 'v'}


def clean(body):
    """The record to store, or None if anything is outside the whitelist."""
    try:
        d = json.loads(body)
    except ValueError:
        return None
    if not isinstance(d, dict) or set(d) - FIELDS or d.get('step') not in STEPS:
        return None
    if not isinstance(d.get('id'), str) or not WORD.match(d['id']):
        return None
    for k in ('week', 'run'):
        if k in d and not (type(d[k]) is int and 0 <= d[k] <= 200):
            return None
    for k in ('detail', 'lang', 'v'):
        if k in d and not (isinstance(d[k], str) and WORD.match(d[k])):
            return None
    return {'at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), **d}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] == '/telemetry':
            self.send_response(204)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        if self.path != '/telemetry':
            self.send_error(404)
            return
        size = int(self.headers.get('Content-Length') or 0)
        record = clean(self.rfile.read(size)) if 0 < size <= 1024 else None
        if record is None:
            self.send_error(400)
            return
        DATA.parent.mkdir(parents=True, exist_ok=True)
        with DATA.open('a', encoding='utf-8') as f:
            f.write(json.dumps(record, separators=(',', ':')) + '\n')
        self.send_response(204)
        self.end_headers()


def selftest():
    ok = clean(b'{"id":"3f2a-9c","step":"trade","week":4,"run":1,"lang":"sw","v":"1-1"}')
    assert ok and ok['week'] == 4 and 'at' in ok
    for bad in [b'not json', b'[]', b'{"id":"a","step":"trade","cash":12000}', b'{"id":"a","step":"hack"}',
                b'{"id":"a b","step":"open"}', b'{"id":"a","step":"trade","week":true}', b'{"id":"a","step":"event","detail":"<script>"}',
                b'{"step":"open"}', b'{"id":"a","step":"open","week":999}']:
        assert clean(bad) is None, bad
    print('preview-server self-check passed')


if __name__ == '__main__':
    if sys.argv[1:] == ['--selftest']:
        selftest()
    else:
        port = int(sys.argv[1]) if len(sys.argv) > 1 else 8769
        ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(APP))).serve_forever()
