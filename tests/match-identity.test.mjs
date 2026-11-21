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

test('räknar dubbla UI-ID:n i gamla och nya matchlistor', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const helperStart = app.indexOf('function countMatchIds(matches: Match[]): Map<string, number> {');
  const helperEnd = app.indexOf('function normalizeTeamName(', helperStart);
  assert.ok(helperStart !== -1 && helperEnd > helperStart, 'Kunde inte hitta ID-räknaren');
  const helper = app.slice(helperStart, helperEnd)
    .replace('matches: Match[]', 'matches')
    .replace('): Map<string, number>', ')')
    .replace('new Map<string, number>()', 'new Map()');
  const countMatchIds = new Function(helper + '\nreturn countMatchIds;')();
  const counts = countMatchIds([
    { id: 'duplicate' }, { id: 'unique' }, { id: 'duplicate' },
  ]);
  assert.equal(counts.get('duplicate'), 2);
  assert.equal(counts.get('unique'), 1);
  assert.equal(counts.get('missing'), undefined);
});

test('partiellt API-fel behåller saknade matcher utan att skapa dubbletter', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const start = app.indexOf('function preserveMatchesOnPartialFailure(');
  const end = app.indexOf('function ensureUniqueMatchIds(', start);
  assert.ok(start !== -1 && end > start, 'Kunde inte hitta reservlogiken');
  const extracted = app.slice(start, end)
    .replace('current: Match[]', 'current')
    .replace('previous: Match[]', 'previous')
    .replace('partialFailure: boolean', 'partialFailure')
    .replace('isSameMatch: (a: Match, b: Match) => boolean', 'isSameMatch')
    .replace('): Match[]', ')');
  const preserve = new Function(extracted + '\nreturn preserveMatchesOnPartialFailure;')();
  const current = [match(101)];
  const previous = [match(101), match(102), match(102)];
  const partial = preserve(current, previous, true, isSameMatch);
  assert.equal(partial.length, 2);
  assert.deepEqual(partial.map((item) => item.apiFootballFixtureId), [101, 102]);
  assert.equal(preserve(current, previous, false, isSameMatch).length, 1);
  assert.equal(current.length, 1, 'Indatalistan ska inte ändras');
});

test('kolliderande match-ID får unika och stabilt ordnade UI-nycklar', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const start = app.indexOf('function ensureUniqueMatchIds(');
  const end = app.indexOf('function countMatchIds(', start);
  assert.ok(start !== -1 && end > start, 'Kunde inte hitta UI-ID-skyddet');
  const extracted = app.slice(start, end)
    .replace('matches: Match[]', 'matches')
    .replace('): Match[]', ')')
    .replace('new Set<string>()', 'new Set()');
  const ensureUniqueMatchIds = new Function(extracted + '\nreturn ensureUniqueMatchIds;')();
  const input = [
    { id: 'same', apiFootballFixtureId: 101 },
    { id: 'same', apiFootballFixtureId: 102 },
    { id: 'same--duplicate-2', apiFootballFixtureId: 103 },
    { id: 'same', apiFootballFixtureId: 104 },
  ];
  const result = ensureUniqueMatchIds(input);
  assert.deepEqual(result.map((item) => item.id), [
    'same', 'same--duplicate-3', 'same--duplicate-2', 'same--duplicate-4',
  ]);
  assert.deepEqual(result.map((item) => item.apiFootballFixtureId), [101, 102, 103, 104]);
  assert.equal(input[1].id, 'same', 'Originalobjekten får inte muteras');
  const repeated = ensureUniqueMatchIds(result);
  assert.deepEqual(repeated, result, 'En ny körning får inte ändra stabila UI-ID:n');
  assert.equal(new Set(result.map((item) => item.id)).size, result.length);
});

test('partiellt API-fel skiljer på fixture-ID även vid samma UI-ID', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const start = app.indexOf('function preserveMatchesOnPartialFailure(');
  const end = app.indexOf('function ensureUniqueMatchIds(', start);
  assert.ok(start !== -1 && end > start);
  const extracted = app.slice(start, end)
    .replace('current: Match[]', 'current')
    .replace('previous: Match[]', 'previous')
    .replace('partialFailure: boolean', 'partialFailure')
    .replace('isSameMatch: (a: Match, b: Match) => boolean', 'isSameMatch')
    .replace('): Match[]', ')');
  const preserve = new Function(extracted + '\nreturn preserveMatchesOnPartialFailure;')();
  const current = [{ ...match(201), id: 'collision' }];
  const previous = [{ ...match(202), id: 'collision' }];
  const visible = preserve(current, previous, true, isSameMatch);
  assert.equal(visible.length, 2);
  assert.deepEqual(visible.map((item) => item.apiFootballFixtureId), [201, 202]);
});
