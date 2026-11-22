import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:4173/goalzone/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Welcome to GoalZone/i }).waitFor({ timeout: 15000 });

  await page.getByRole('button', { name: /Upcoming fixtures/i }).first().click();
  await page.getByRole('heading', { name: 'Upcoming Fixtures' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Back to Home/i }).count(), 1);

  await page.getByRole('button', { name: /Back to Home/i }).click();
  await page.getByRole('heading', { name: 'Explore GoalZone' }).waitFor();

  await page.getByRole('button', { name: /Search Teams/i }).click();
  await page.getByRole('heading', { name: 'Search Teams' }).waitFor();
  await page.getByRole('button', { name: /Back to Home/i }).click();

  // Exercise the mobile-first navigation at a narrow iPhone-sized viewport.
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole('navigation', { name: 'Mobilnavigering' }).waitFor();
  const mobileNav = page.getByRole('navigation', { name: 'Mobilnavigering' });
  for (const tab of ['Hem', 'LIVE', 'Matcher', 'Ligor', 'Favoriter']) {
    assert.equal(await mobileNav.getByRole('button', { name: tab, exact: true }).count(), 1);
  }
  await mobileNav.getByRole('button', { name: 'Matcher' }).click();
  await page.getByRole('heading', { name: 'Upcoming Fixtures' }).waitFor();
  assert.equal(await mobileNav.getByRole('button', { name: 'Matcher' }).getAttribute('aria-current'), 'page');
  await mobileNav.getByRole('button', { name: 'Ligor' }).click();
  await page.getByRole('heading', { name: 'League Standings' }).waitFor();
  await mobileNav.getByRole('button', { name: 'Hem' }).click();
  await page.getByRole('heading', { name: 'Explore GoalZone' }).waitFor();
  const horizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1
  );
  assert.equal(horizontalOverflow, false, '320px mobile viewport must not scroll horizontally');

  console.log('Browser interactions passed: desktop navigation and 320px mobile tabs without horizontal overflow.');
} finally {
  await browser.close();
}
