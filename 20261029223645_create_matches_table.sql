/*
# Create matches table for GoalZone

## Purpose
Stores football matches managed from the private admin dashboard. Visitors (no login)
can read all matches; only authenticated admins can create, update, and delete them.

## New Tables
- `matches`
  - `id` (uuid, primary key)
  - `home_team` (text, not null) — full home team name
  - `home_short` (text, not null) — 3-letter abbreviation for crest
  - `home_color` (text, not null) — hex color for crest background
  - `away_team` (text, not null) — full away team name
  - `away_short` (text, not null) — 3-letter abbreviation for crest
  - `away_color` (text, not null) — hex color for crest background
  - `league` (text, not null) — league display name
  - `league_id` (text, not null) — league identifier used for filtering
  - `home_score` (int, default 0) — home goals
  - `away_score` (int, default 0) — away goals
  - `status` (text, not null, check upcoming|live|finished) — match status
  - `minute` (int, nullable) — current minute for live matches
  - `kickoff` (timestamptz, not null) — match start time
  - `venue` (text, not null) — stadium / venue name
  - `stream_url` (text, nullable) — official free streaming URL; must be http(s)
  - `embed_url` (text, nullable) — optional embeddable video URL
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `matches`.
- SELECT granted to `anon, authenticated` (visitors read without login).
- INSERT / UPDATE / DELETE granted to `authenticated` only (admins).
- SELECT policy: public read for everyone (`TO anon, authenticated USING (true)`) —
  match data is intentionally public.
- Write policies: only authenticated users may write. Since the only authenticated
  users are the admins you create, this keeps the dashboard private.
- A CHECK constraint rejects invalid status values.
*/

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team text NOT NULL,
  home_short text NOT NULL,
  home_color text NOT NULL DEFAULT '#22ff66',
  away_team text NOT NULL,
  away_short text NOT NULL,
  away_color text NOT NULL DEFAULT '#3b82f6',
  league text NOT NULL,
  league_id text NOT NULL,
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished')),
  minute int,
  kickoff timestamptz NOT NULL,
  venue text NOT NULL DEFAULT '',
  stream_url text,
  embed_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Public read: anyone (including anon visitors) can see matches
GRANT SELECT ON matches TO anon, authenticated;

DROP POLICY IF EXISTS "matches_public_read" ON matches;
CREATE POLICY "matches_public_read"
  ON matches FOR SELECT
  TO anon, authenticated
  USING (true);

-- Write: only authenticated users (admins) can manage matches
GRANT INSERT, UPDATE, DELETE ON matches TO authenticated;

DROP POLICY IF EXISTS "matches_admin_insert" ON matches;
CREATE POLICY "matches_admin_insert"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "matches_admin_update" ON matches;
CREATE POLICY "matches_admin_update"
  ON matches FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "matches_admin_delete" ON matches;
CREATE POLICY "matches_admin_delete"
  ON matches FOR DELETE
  TO authenticated
  USING (true);
