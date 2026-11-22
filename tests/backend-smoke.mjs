#!/usr/bin/env node
// Read-only smoke test against an explicitly configured Supabase test project.
// Never logs keys, tokens, or response bodies.
const url = process.env.GOALZONE_SUPABASE_URL?.trim().replace(/\/$/, '');
const key = process.env.GOALZONE_SUPABASE_ANON_KEY?.trim();
const fixtureId = Number(process.env.GOALZONE_TEST_FIXTURE_ID);
if (!url || !key || !/^https:\/\/[^/]+\.supabase\.co$/.test(url)) {
  console.error('Set GOALZONE_SUPABASE_URL (https://PROJECT.supabase.co) and GOALZONE_SUPABASE_ANON_KEY.');
  process.exit(2);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
let failures = 0;
async function check(name, endpoint, init, validate) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(url + endpoint, { ...init, headers: { ...headers, ...init?.headers }, signal: controller.signal });
    } finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!validate(body)) throw new Error('unexpected response contract');
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
await check('matches table (read only)', '/rest/v1/matches?select=id&limit=1', { method: 'GET' }, Array.isArray);
await check('football-matches function', '/functions/v1/football-matches', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
}, data => data?.success === true && Array.isArray(data.matches));
if (Number.isSafeInteger(fixtureId) && fixtureId > 0) {
  await check('football-api-details function', '/functions/v1/football-api-details', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fixtureId }),
  }, data => data?.success === true && typeof data.found === 'boolean' &&
    (!data.found || (data.details && ['events', 'lineups', 'statistics'].every(k => Array.isArray(data.details[k])))));
} else {
  console.log('SKIP football-api-details (set GOALZONE_TEST_FIXTURE_ID to an existing fixture ID)');
}
if (failures) process.exitCode = 1;
