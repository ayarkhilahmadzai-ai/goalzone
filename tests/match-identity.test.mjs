import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Testa den faktiska dublettfunktionen i App.tsx utan att starta React.
// Endast TypeScript-typannoteringarna på funktionsparametrarna tas bort.
const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const start = source.indexOf('      const normalizeTeam = (name: string) =>');
const end = source.indexOf('      // API:t kan skicka samma match flera gånger.', start);
assert.ok(start !== -1 && end > start, 'Kunde inte hitta matchidentifieringen i App.tsx');
const extracted = source.slice(start, end)
  .replace('(name: string)', '(name)')
  .replace('(a: Match, b: Match)', '(a, b)');
const isSameMatch = new Function(extracted + '\nreturn isSameMatch;')();

const match = (fixtureId, kickoff = '2026-11-22T18:00:00Z', home = 'Alpha FC', away = 'Beta FC', leagueId = 'league-1', id = 'same-ui-id') => ({
  id, leagueId, kickoff, home: { name: home }, away: { name: away },
  apiFootballFixtureId: fixtureId,
});

test('samma verifierade fixture-ID matchar trots ändrad avsparkstid', () => {
  assert.equal(isSameMatch(match(101), match(101, '2026-11-23T20:00:00Z')), true);
});

test('olika verifierade fixture-ID:n hålls isär trots samma UI-ID', () => {
  assert.equal(isSameMatch(match(101), match(102)), false);
});

test('olika ligor hålls isär', () => {
  assert.equal(isSameMatch(match(101), match(101, undefined, undefined, undefined, 'league-2')), false);
});

test('utan fixture-ID krävs samma lag och nära avsparkstid', () => {
  assert.equal(isSameMatch(match(null), match(null, '2026-11-22T18:10:00Z')), true);
  assert.equal(isSameMatch(match(null), match(null, '2026-11-22T19:00:00Z')), false);
  assert.equal(isSameMatch(match(null), match(null, undefined, 'Gamma FC')), false);
});

test('ogiltiga normaliserade lagnamn ger aldrig en säker match', () => {
  assert.equal(isSameMatch(match(null, undefined, '!!!'), match(null, undefined, '!!!')), false);
});

test('kolliderande UI-ID räcker inte när fixture-ID saknas', () => {
  assert.equal(isSameMatch(match(101), match(null, '2026-11-23T18:00:00Z')), false);
});

test('matchning är symmetrisk oavsett vilken källa som jämförs först', () => {
  const manual = match(null);
  const automatic = match(101, '2026-11-22T18:10:00Z');
  assert.equal(isSameMatch(manual, automatic), true);
  assert.equal(isSameMatch(automatic, manual), true);
});

test('tidsgränsen är inkluderande vid exakt 15 minuter', () => {
  assert.equal(isSameMatch(match(null), match(null, '2026-11-22T18:15:00Z')), true);
  assert.equal(isSameMatch(match(null), match(null, '2026-11-22T18:15:01Z')), false);
});

test('ogiltiga avsparkstider ger ingen reservmatchning', () => {
  assert.equal(isSameMatch(match(null, 'not-a-date'), match(null)), false);
});

test('hemma- och bortalag får inte byta plats vid reservmatchning', () => {
  assert.equal(isSameMatch(match(null), match(null, undefined, 'Beta FC', 'Alpha FC')), false);
});

test('diakritiska tecken och skiljetecken normaliseras konsekvent', () => {
  assert.equal(isSameMatch(match(null, undefined, 'Málaga FC'), match(null, undefined, 'Malaga F.C.')), true);
});
