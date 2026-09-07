// Static delivery wiring; the full browser playthrough checks the actual app flow.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sw = read('app/sw.js'), html = read('app/index.html');
const shell = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(p => p.includes('.'));
assert(shell.length > 5);
for (const file of shell) assert(existsSync(new URL(`../app/${file}`, import.meta.url)), file);
for (const id of ['decision', 'situation', 'save-status', 'learners', 'record', 'print-record']) assert(html.includes(`id="${id}"`));
assert(html.indexOf('id="decision"') < html.indexOf('id="pnl"'));
assert(html.includes('aria-expanded="false"'));
assert(sw.includes('build-info.json'));
assert(!sw.includes('skipWaiting()'));
assert(html.includes('serviceWorker.register'));
const chapters = JSON.parse(read('app/content/chapters.json')).chapters;
const shellBytes = gzipSync(sw).length + shell.reduce((sum, file) => sum + gzipSync(read(`app/${file}`)).length, 0);
for (const chapter of chapters) {
  const bytes = gzipSync(read(`app/content/${chapter.file}`)).length;
  assert(bytes <= 60 * 1024, chapter.id);
  if (chapter === chapters[0]) assert(shellBytes + bytes <= 150 * 1024, `First load: ${shellBytes + bytes}`);
}
console.log(`Delivery wiring and download budgets passed (${shellBytes} compressed shell bytes)`);
