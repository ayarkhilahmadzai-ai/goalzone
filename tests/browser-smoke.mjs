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

  await page.getByRole('navigation').first().getByRole('button', { name: 'Live' }).click();
  await page.getByRole('heading', { name: 'Live Matches' }).first().waitFor();
  await page.getByRole('navigation').first().getByRole('button', { name: 'Matches' }).click();
  await page.getByRole('heading', { name: 'Upcoming Fixtures' }).first().waitFor();
  await page.getByRole('button', { name: /Back to Home/i }).click();
  await page.getByRole('heading', { name: 'Explore GoalZone' }).waitFor();

  // Keyboard users can reach the homepage actions and activate them.
  const liveAction = page.getByRole('button', { name: /Watch live/i });
  await liveAction.focus();
  assert.equal(await liveAction.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Live Matches' }).first().waitFor();
  await page.getByRole('button', { name: /Back to Home/i }).click();

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
  assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', { name: 'Menu' }).click();
  assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'true');
  const headerMobileMenu = page.getByRole('navigation', { name: 'Huvudmeny mobil' });
  await headerMobileMenu.getByRole('button', { name: 'Live' }).click();
  await page.getByRole('heading', { name: 'Live Matches' }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', { name: 'Menu' }).click();
  await headerMobileMenu.getByRole('button', { name: 'Matches' }).click();
  await page.getByRole('heading', { name: 'Upcoming Fixtures' }).first().waitFor();
  await page.getByRole('navigation', { name: 'Mobilnavigering' }).waitFor();
  const menuToggle = page.getByRole('button', { name: 'Menu' });
  await menuToggle.focus();
  assert.equal(await menuToggle.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await menuToggle.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Enter');
  assert.equal(await menuToggle.getAttribute('aria-expanded'), 'false');
  const mobileNav = page.getByRole('navigation', { name: 'Mobilnavigering' });
  for (const tab of ['Hem', 'LIVE', 'Matcher', 'Ligor', 'Favoriter']) {
    assert.equal(await mobileNav.getByRole('button', { name: tab, exact: true }).count(), 1);
  }
  await mobileNav.getByRole('button', { name: 'Matcher' }).click();
  await page.getByRole('heading', { name: 'Upcoming Fixtures' }).waitFor();
  assert.equal(await mobileNav.getByRole('button', { name: 'Matcher' }).getAttribute('aria-current'), 'page');
  await mobileNav.getByRole('button', { name: 'Ligor' }).click();
  await page.getByRole('heading', { name: 'League Standings' }).first().waitFor();
  await mobileNav.getByRole('button', { name: 'Favoriter' }).click();
  await page.getByRole('heading', { name: 'Favorite Teams' }).first().waitFor();
  assert.equal(await mobileNav.getByRole('button', { name: 'Favoriter' }).getAttribute('aria-current'), 'page');
  await mobileNav.getByRole('button', { name: 'LIVE' }).click();
  await page.getByRole('heading', { name: 'Live Matches' }).first().waitFor();
  await mobileNav.getByRole('button', { name: 'Hem' }).click();
  await page.getByRole('heading', { name: 'Explore GoalZone' }).waitFor();
  await page.getByRole('button', { name: /Search Teams/i }).click();
  await page.getByRole('heading', { name: 'Search Teams' }).first().waitFor();
  const teamSearch = page.getByRole('searchbox', { name: 'Search for a team' });
  // Search remains usable even if the backend is unavailable in CI.
  await teamSearch.waitFor();
  await teamSearch.fill('Arsenal');
  assert.equal(await teamSearch.inputValue(), 'Arsenal');
  await teamSearch.fill('');
  assert.equal(await teamSearch.inputValue(), '');
  await mobileNav.getByRole('button', { name: 'Hem' }).click();
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 760 });
    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1
    );
    assert.equal(horizontalOverflow, false, `${width}px mobile viewport must not scroll horizontally`);
    assert.equal(await mobileNav.isVisible(), true, `Mobile navigation must be visible at ${width}px`);
  }

  console.log('Browser interactions passed: desktop navigation and mobile tabs, favorites, search, and four viewport widths without horizontal overflow.');
} finally {
  await browser.close();
}
