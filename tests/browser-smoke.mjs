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
  for (const tab of ['Hem', 'Matcher', 'Tabeller', 'Skytteliga', 'Favoriter']) {
    assert.equal(await mobileNav.getByRole('button', { name: tab, exact: true }).count(), 1);
  }
  await mobileNav.getByRole('button', { name: 'Matcher' }).click();
  await page.getByRole('heading', { name: 'Upcoming Fixtures' }).waitFor();
  assert.equal(await mobileNav.getByRole('button', { name: 'Matcher' }).getAttribute('aria-current'), 'page');
  await mobileNav.getByRole('button', { name: 'Tabeller' }).click();
  await page.getByRole('heading', { name: 'League Standings' }).first().waitFor();
  await mobileNav.getByRole('button', { name: 'Favoriter' }).click();
  await page.getByRole('heading', { name: 'Favorite Teams' }).first().waitFor();
  assert.equal(await mobileNav.getByRole('button', { name: 'Favoriter' }).getAttribute('aria-current'), 'page');
  await mobileNav.getByRole('button', { name: 'Skytteliga' }).click();
  await page.getByRole('heading', { name: 'Top Scorers' }).first().waitFor();
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

  // Deterministic backend simulation: verify real rendered match cards,
  // distinct fixture identities, search, and match-detail navigation.
  const fixturePage = await browser.newPage({ viewport: { width: 375, height: 760 } });
  const row = (id, fixtureId, home, away, status = 'upcoming') => ({
    id, api_football_fixture_id: fixtureId, home_team: home,
    home_short: home.slice(0, 3).toUpperCase(), home_color: '#ef4444',
    away_team: away, away_short: away.slice(0, 3).toUpperCase(),
    away_color: '#38bdf8', league: 'Premier League', league_id: 'epl',
    home_score: status === 'live' ? 2 : 0, away_score: 0, status,
    minute: status === 'live' ? 65 : null, kickoff: '2026-12-01T18:00:00Z',
    venue: 'Test Stadium', stream_url: null, embed_url: null,
    created_at: '2026-11-22T12:00:00Z',
  });
  const apiMatches = [
    row('api-a', 50101, 'Arsenal', 'Chelsea', 'live'),
    row('api-b', 50102, 'Liverpool', 'Everton'),
    row('api-c', 50103, 'Liverpool', 'Everton'),
  ];
  let detailsRequested = 0;
  await fixturePage.route('**/rest/v1/matches*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await fixturePage.route('**/functions/v1/football-matches', route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, matches: apiMatches }),
    })
  );
  await fixturePage.route('**/functions/v1/football-api-details', async route => {
    detailsRequested += 1;
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true, found: true,
        details: {
          events: [{ time: { elapsed: 25 }, team: { name: 'Arsenal' },
            player: { name: 'Test Scorer' }, type: 'Goal', detail: 'Normal Goal' }],
          lineups: [
            { team: { name: 'Arsenal' }, startXI: [{ player: { id: 81, name: 'Test Starter', number: 8, pos: 'M' } }] },
            { team: { name: 'Chelsea' }, startXI: [{ player: { id: 82, name: 'Test Keeper', number: 1, pos: 'G' } }] },
          ],
          statistics: [
            { team: { name: 'Arsenal' }, statistics: [{ type: 'Ball Possession', value: '60%' }] },
            { team: { name: 'Chelsea' }, statistics: [{ type: 'Ball Possession', value: '40%' }] },
          ],
        },
      }),
    });
  });
  await fixturePage.goto('http://127.0.0.1:4173/goalzone/', { waitUntil: 'domcontentloaded' });
  await fixturePage.getByRole('heading', { name: /Welcome to GoalZone/i }).waitFor();
  await fixturePage.getByRole('navigation', { name: 'Mobilnavigering' })
    .getByRole('button', { name: 'Matcher' }).click();
  const derbyCards = fixturePage.getByRole('button', { name: /Liverpool mot Everton/ });
  await derbyCards.first().waitFor({ timeout: 15000 });
  assert.equal(await derbyCards.count(), 2,
    'Different fixture IDs with identical teams and kickoff must stay separate');
  await fixturePage.getByRole('navigation', { name: 'Mobilnavigering' })
    .getByRole('button', { name: 'LIVE' }).click();
  const arsenalCard = fixturePage.getByRole('button', { name: /Arsenal mot Chelsea, Premier League, LIVE/ });
  await arsenalCard.first().waitFor();
  await arsenalCard.first().click();
  await fixturePage.getByRole('navigation', { name: 'Matchdetaljer' }).waitFor();
  await fixturePage.getByText('Test Scorer').first().waitFor({ timeout: 15000 });
  assert.ok(detailsRequested > 0, 'Match details endpoint must be called');
  await fixturePage.getByText('Test Starter').first().waitFor();
  await fixturePage.getByText('Test Keeper').first().waitFor();
  await fixturePage.close();

  console.log('Browser interactions passed: desktop navigation and mobile tabs, favorites, search, and four viewport widths without horizontal overflow.');
} finally {
  await browser.close();
}
