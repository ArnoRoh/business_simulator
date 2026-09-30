#!/usr/bin/env python3
"""Where players stop: a funnel from the opt-in progress notes (D-068).

Run:    python3 scripts/telemetry-report.py [path-to-telemetry.jsonl]
Check:  python3 scripts/telemetry-report.py --selftest

Counts only players who said yes, so it describes consenting players, not everyone.
"""
import json
import sys
from collections import Counter, defaultdict

sys.path.insert(0, __file__.rsplit('/', 1)[0])
DEFAULT = __import__('importlib').import_module('preview-server').DATA


def funnel(lines):
    players = defaultdict(lambda: {'weeks': 0, 'steps': set(), 'last': None, 'events': set(), 'lang': ''})
    for line in lines:
        r = json.loads(line)
        p = players[r['id']]
        p['steps'].add(r['step']); p['last'] = r; p['lang'] = r.get('lang', p['lang'])
        if r['step'] == 'trade': p['weeks'] = max(p['weeks'], r.get('week', 0))
        if r['step'] == 'event': p['events'].add(r.get('detail', ''))
    n = len(players)
    rows = [('said yes and opened', n), ('closed the guide', sum('guide' in p['steps'] for p in players.values())),
            ('opened a panel', sum('panel' in p['steps'] for p in players.values()))]
    rows += [(f'traded week {w}+', sum(p['weeks'] >= w for p in players.values())) for w in (1, 2, 4, 8, 12, 16, 20, 24)]
    rows += [('finished the season', sum('finished' in p['steps'] for p in players.values())),
             ('closed the business', sum('closed' in p['steps'] for p in players.values()))]
    stopped = Counter(f"{p['last']['step']}{':' + p['last']['detail'] if p['last'].get('detail') else ''} (week {p['last'].get('week', '?')})"
                      for p in players.values() if 'finished' not in p['steps'])
    events = Counter(e for p in players.values() for e in p['events'])
    return n, rows, stopped, events, Counter(p['lang'] for p in players.values())


def show(lines):
    n, rows, stopped, events, langs = funnel(lines)
    print(f'Players who said yes: {n}  ({", ".join(f"{k or "?"}: {v}" for k, v in langs.items())})\n')
    for label, count in rows:
        print(f'  {label:<24} {count:>5}  {count / n:>5.0%}  {"#" * round(30 * count / n)}' if n else f'  {label:<24} 0')
    print('\nLast note from players who have not finished:')
    for label, count in stopped.most_common(15):
        print(f'  {count:>5}  {label}')
    print('\nEvents answered (players):')
    for label, count in events.most_common():
        print(f'  {count:>5}  {label}')


def selftest():
    notes = [{'id': 'a', 'step': 'open'}, {'id': 'a', 'step': 'trade', 'week': 1}, {'id': 'a', 'step': 'trade', 'week': 2},
             {'id': 'a', 'step': 'event', 'week': 3, 'detail': 'pot'}, {'id': 'b', 'step': 'open'},
             {'id': 'c', 'step': 'trade', 'week': 24}, {'id': 'c', 'step': 'finished'}]
    n, rows, stopped, events, _ = funnel(json.dumps(x) for x in notes)
    d = dict(rows)
    assert n == 3 and d['traded week 1+'] == 2 and d['traded week 2+'] == 2 and d['traded week 24+'] == 1 and d['finished the season'] == 1
    assert stopped == Counter({'event:pot (week 3)': 1, 'open (week ?)': 1}) and events == Counter({'pot': 1})
    print('telemetry-report self-check passed')


if __name__ == '__main__':
    if sys.argv[1:] == ['--selftest']:
        selftest()
    else:
        path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
        try:
            with open(path, encoding='utf-8') as f:
                show([line for line in f if line.strip()])
        except FileNotFoundError:
            print(f'No progress notes yet at {path}.')
