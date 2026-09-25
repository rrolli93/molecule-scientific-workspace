import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3022/');
  await page.locator('main[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: 'Open program' }).click();
  await page.getByRole('button', { name: 'Generate example assessment' }).click();
  await page.getByRole('button', { name: 'E02' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open scientific review' }).click();
  await page.getByRole('button', { name: 'Accept assessment' }).click();
  assert.match(await page.getByRole('alert').textContent(), /Switch/);
  await page.getByRole('button', { name: /Demo scientist/ }).click();
  await page.getByRole('button', { name: 'Accept assessment' }).click();
  assert.match(await page.getByRole('alert').textContent(), /reasoning/);
  await page.getByLabel('Your reasoning').fill('Resolve the conflicting result before prioritizing.');
  await page.getByRole('button', { name: 'Request changes' }).click();
  await page.getByRole('heading', { name: 'Assessment returned for changes.' }).waitFor();
  await page.getByRole('button', { name: 'Reopen review' }).click();
  await page.getByLabel('Your reasoning').fill('Accept the evidence assessment; retain the unresolved gaps.');
  await page.getByRole('button', { name: 'Accept assessment' }).click();
  await page.getByRole('heading', { name: 'Assessment accepted for the demo record.' }).waitFor();
  await page.getByRole('button', { name: 'Back to program overview' }).click();
  assert.match(await page.locator('.status').textContent(), /gaps remain/);
  await page.getByRole('navigation').getByRole('button', { name: /Knowledge/ }).click();
  await page.getByLabel('Search evidence').fill('no such source');
  await page.getByText('No matching evidence.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Reset walkthrough' }).click();
  await page.screenshot({ path: 'public/screenshot.jpeg', type: 'jpeg', quality: 90 });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile page overflows');
  await page.getByRole('button', { name: 'Open program' }).click();
  await page.getByRole('button', { name: 'Generate example assessment' }).click();
  await page.getByRole('button', { name: 'Open scientific review' }).click();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile review overflows');
  await page.screenshot({ path: '/tmp/vivamed-concept-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: assessment, source inspection, role/rationale gates, change request, acceptance, search, mobile layout; no browser errors.');
} finally {
  await browser.close();
}
