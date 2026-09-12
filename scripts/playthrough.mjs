// Every chapter and both languages in Chromium, including real IndexedDB writes.
import assert from 'node:assert/strict';
import { browserApp, session, advance } from './lib/browser.mjs';
const app = await browserApp();
let checked = 0;
try {
  for (const language of ['en', 'sw']) {
    const context = await app.browser.newContext({ viewport: { width: 320, height: 740 } });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(app.url);
    await page.locator('.chapter-card').first().waitFor();
    await page.locator(`[data-lang="${language}"]`).click();
    for (let chapter = 0; chapter < 4; chapter++) {
      if (chapter === 0) await page.locator('.chapter-card').first().click();
      await page.locator('.episode-progress').waitFor();
      for (let action = 0; action < 180; action++) {
        const saved = await session(page);
        assert(saved, 'The opening and every draft must be saved');
        if (saved.completed) break;
        const body = await page.locator('body').innerText();
        assert(!/NaN|undefined|\[object Object\]|Infinity/.test(body), body);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow: ${language}/${saved.scenarioId}/${saved.turnIndex}`);
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Enlarged text overflow: ${language}/${saved.scenarioId}/${saved.turnIndex}`);
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
        if (saved.result) {
          const c = saved.result.cash;
          assert(Math.abs(c.opening + c.direct + c.profit + c.depreciation - c.repayment - c.workingCapitalChange - c.closing) < .001);
          const observations = saved.record.observations;
          const decision = observations.findLast(o => o.kind === 'decision');
          assert.equal(decision.forecast, 'not-requested');
          assert.equal(decision.interactionVersion, 2);
          assert(!observations.some(o => o.kind === 'prediction'), 'Play must not invent an estimate');
        }
        checked++;
        await advance(page);
      }
      const final = await session(page);
      assert(final.completed, `${language}/${chapter} must finish`);
      assert.equal(final.authoredDone, 20);
      assert.equal(final.record.observations.filter(o => o.kind === 'decision' && !o.turnId.startsWith('recovery-')).length, 20);
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log(`${language}/${final.scenarioId}: 20 decisions and results retained`);
      assert(await page.locator('.chapter-transition').isVisible(), 'A chapter ends with its story transition');
      if (chapter < 3) await page.locator('.chapter-transition .btn-primary').click();
    }
    await context.close();
  }
  console.log(`${checked} browser screens checked`);
} finally { await app.close(); }
