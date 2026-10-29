import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, LogOut, Save, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { SAMPLE_LEAGUES } from '@/data';
import type { Match, MatchStatus } from '@/types';
import { formatKickoff } from '@/data';
import { rowToMatch, matchToRow, type MatchRow } from '@/lib/matchMapping';

const LEAGUES = SAMPLE_LEAGUES.filter((l) => l.id !== 'all');
const TEAM_COLORS = ['#ef4444', '#f43f5e', '#dc2626', '#facc15', '#22c55e', '#0ea5e9', '#38bdf8', '#3b82f6', '#a855f7', '#f5f5f5', '#111827', '#f8fafc'];

interface FormState {
  id: string | null;
  home_team: string;
  home_short: string;
  home_color: string;
  away_team: string;
  away_short: string;
  away_color: string;
  league: string;
  league_id: string;
  home_score: number;
  away_score: number;
  status: MatchStatus;
  minute: number | '';
  kickoff: string;
  venue: string;
  stream_url: string;
  embed_url: string;
}

const emptyForm: FormState = {
  id: null,
  home_team: '',
  home_short: '',
  home_color: '#22ff66',
  away_team: '',
  away_short: '',
  away_color: '#3b82f6',
  league: 'Premier League',
  league_id: 'epl',
  home_score: 0,
  away_score: 0,
  status: 'upcoming',
  minute: '',
  kickoff: '',
  venue: '',
  stream_url: '',
  embed_url: '',
};

function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(val: string): string {
  return new Date(val).toISOString();
}

function rowToForm(r: MatchRow): FormState {
  return {
    id: r.id,
    home_team: r.home_team,
    home_short: r.home_short,
    home_color: r.home_color,
    away_team: r.away_team,
    away_short: r.away_short,
    away_color: r.away_color,
    league: r.league,
    league_id: r.league_id,
    home_score: r.home_score,
    away_score: r.away_score,
    status: r.status,
    minute: r.minute ?? '',
    kickoff: toLocalInput(r.kickoff),
    venue: r.venue,
    stream_url: r.stream_url ?? '',
    embed_url: r.embed_url ?? '',
  };
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff', { ascending: false });
    if (error) {
      setError('Could not load matches. Please try again.');
    } else if (data) {
      setMatches((data as MatchRow[]).map(rowToMatch));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setForm(emptyForm);
    setEditing(true);
  }

  function startEdit(m: Match) {
    // fetch raw row for editing
    supabase.from('matches').select('*').eq('id', m.id).single().then(({ data }) => {
      if (data) {
        setForm(rowToForm(data as MatchRow));
        setEditing(true);
      }
    });
  }

  function cancelEdit() {
    setForm(emptyForm);
    setEditing(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // validate stream URL if provided
    if (form.stream_url && !/^https?:\/\//.test(form.stream_url)) {
      setError('Streaming URL must start with http:// or https://');
      setSaving(false);
      return;
    }
    if (form.embed_url && !/^https?:\/\//.test(form.embed_url)) {
      setError('Embed URL must start with http:// or https://');
      setSaving(false);
      return;
    }

    const payload = matchToRow({
      id: form.id ?? '',
      league: form.league,
      leagueId: form.league_id,
      home: { name: form.home_team, short: form.home_short, color: form.home_color },
      away: { name: form.away_team, short: form.away_short, color: form.away_color },
      homeScore: Number(form.home_score) || 0,
      awayScore: Number(form.away_score) || 0,
      status: form.status,
      minute: form.minute === '' ? undefined : Number(form.minute),
      kickoff: fromLocalInput(form.kickoff),
      venue: form.venue,
      events: [],
      streamAuthorized: false,
      streamUrl: form.stream_url || undefined,
      embedUrl: form.embed_url || undefined,
    });

    let result;
    if (form.id) {
      result = await supabase.from('matches').update(payload).eq('id', form.id).select();
    } else {
      result = await supabase.from('matches').insert(payload).select();
    }

    setSaving(false);
    if (result.error) {
      setError('Could not save the match. Please check your inputs and try again.');
      return;
    }
    cancelEdit();
    await load();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('matches').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      setError('Could not delete the match. Please try again.');
      return;
    }
    await load();
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="container-app animate-fade-in py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Trophy className="h-6 w-6 text-pitch-400" />
            Match management
          </h1>
          <p className="mt-1 text-sm text-ink-400">Add, edit and delete the matches shown on GoalZone.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 rounded-xl bg-pitch-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-neon-sm transition-all hover:shadow-neon"
          >
            <Plus className="h-4 w-4" /> New match
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-ink-200 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="card mb-6 p-6 animate-slide-up">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{form.id ? 'Edit match' : 'New match'}</h2>
            <button type="button" onClick={cancelEdit} className="text-ink-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Home team */}
            <Field label="Home team" required>
              <input className={inputCls} value={form.home_team} onChange={(e) => set('home_team', e.target.value)} required placeholder="Arsenal" />
            </Field>
            <Field label="Home short (3 letters)" required>
              <input className={inputCls} value={form.home_short} maxLength={4} onChange={(e) => set('home_short', e.target.value.toUpperCase())} required placeholder="ARS" />
            </Field>
            <Field label="Home color">
              <ColorPicker value={form.home_color} onChange={(v) => set('home_color', v)} />
            </Field>

            {/* Away team */}
            <Field label="Away team" required>
              <input className={inputCls} value={form.away_team} onChange={(e) => set('away_team', e.target.value)} required placeholder="Manchester City" />
            </Field>
            <Field label="Away short (3 letters)" required>
              <input className={inputCls} value={form.away_short} maxLength={4} onChange={(e) => set('away_short', e.target.value.toUpperCase())} required placeholder="MCI" />
            </Field>
            <Field label="Away color">
              <ColorPicker value={form.away_color} onChange={(v) => set('away_color', v)} />
            </Field>

            {/* League */}
            <Field label="League" required>
              <select className={inputCls} value={form.league_id} onChange={(e) => {
                const lg = LEAGUES.find((l) => l.id === e.target.value);
                set('league_id', e.target.value);
                if (lg) set('league', lg.name);
              }}>
                {LEAGUES.map((l) => <option key={l.id} value={l.id} className="bg-ink-900">{l.name}</option>)}
              </select>
            </Field>

            {/* Status */}
            <Field label="Match status" required>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as MatchStatus)}>
                <option value="upcoming" className="bg-ink-900">Upcoming</option>
                <option value="live" className="bg-ink-900">Live</option>
                <option value="finished" className="bg-ink-900">Finished</option>
              </select>
            </Field>

            {/* Date */}
            <Field label="Match date & time" required>
              <input type="datetime-local" className={inputCls} value={form.kickoff} onChange={(e) => set('kickoff', e.target.value)} required />
            </Field>

            {/* Scores */}
            <Field label="Home score">
              <input type="number" min={0} className={inputCls} value={form.home_score} onChange={(e) => set('home_score', Number(e.target.value))} />
            </Field>
            <Field label="Away score">
              <input type="number" min={0} className={inputCls} value={form.away_score} onChange={(e) => set('away_score', Number(e.target.value))} />
            </Field>
            <Field label="Live minute (if live)">
              <input type="number" min={0} max={120} className={inputCls} value={form.minute} onChange={(e) => set('minute', e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 67" />
            </Field>

            {/* Venue */}
            <Field label="Venue">
              <input className={inputCls} value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Emirates Stadium" />
            </Field>

            {/* Stream URLs */}
            <Field label="Official free streaming URL">
              <input type="url" className={inputCls} value={form.stream_url} onChange={(e) => set('stream_url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Embed video URL (optional)">
              <input type="url" className={inputCls} value={form.embed_url} onChange={(e) => set('embed_url', e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-pitch-500 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-neon-sm transition-all hover:shadow-neon disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save match'}
            </button>
            <button type="button" onClick={cancelEdit} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink-200 hover:bg-white/10">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Match list */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-400">Loading matches…</div>
      ) : matches.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-400">No matches yet. Click <strong>New match</strong> to add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <div key={m.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <StatusPill status={m.status} minute={m.minute} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-100">
                    {m.home.name} <span className="text-ink-500">vs</span> {m.away.name}
                    {(m.status === 'live' || m.status === 'finished') && (
                      <span className="ml-2 font-bold tabular-nums text-pitch-400">{m.homeScore}–{m.awayScore}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {m.league} • {formatKickoff(m.kickoff)} • {m.venue || 'No venue'}
                    {m.streamUrl && <span className="ml-1 text-pitch-400">• Stream ✓</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(m)} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 hover:bg-white/10">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteId(m.id)} className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteId(null)}>
          <div className="card max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Delete this match?</h3>
            <p className="mt-1 text-sm text-ink-400">This action cannot be undone.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
                Delete
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-ink-200 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/5 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-ink-500 focus:border-pitch-500/40 focus:ring-2 focus:ring-pitch-500/20';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-200">
        {label}{required && <span className="ml-0.5 text-pitch-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-ink-900" />
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#22ff66" />
      <div className="flex gap-1">
        {TEAM_COLORS.slice(0, 6).map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className="h-6 w-6 rounded-full ring-1 ring-white/10 hover:ring-pitch-500/50" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status, minute }: { status: MatchStatus; minute?: number }) {
  if (status === 'live') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-pitch-500/15 px-2.5 py-1 text-xs font-bold text-pitch-400 ring-1 ring-pitch-500/30">
        <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
        LIVE {minute ?? 0}&apos;
      </span>
    );
  }
  if (status === 'finished') {
    return <span className="rounded-full bg-ink-700/60 px-2.5 py-1 text-xs font-semibold text-ink-300">FT</span>;
  }
  return <span className="rounded-full bg-ink-700/60 px-2.5 py-1 text-xs font-semibold text-ink-300">Upcoming</span>;
}
