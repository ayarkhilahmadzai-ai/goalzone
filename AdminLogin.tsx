import { useState, type FormEvent } from 'react';
import { Activity, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: msg } = await signIn(email, password);
    setBusy(false);
    if (msg) setError(msg === 'Invalid login credentials' ? 'Incorrect email or password.' : msg);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 animate-slide-up">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pitch-500/15 ring-2 ring-pitch-500/30">
              <Lock className="h-6 w-6 text-pitch-400" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">Admin access</h1>
            <p className="mt-1 text-sm text-ink-400">
              Sign in to manage GoalZone matches. Visitors don&apos;t need an account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/5 bg-ink-900/60 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-ink-500 focus:border-pitch-500/40 focus:ring-2 focus:ring-pitch-500/20"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/5 bg-ink-900/60 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-ink-500 focus:border-pitch-500/40 focus:ring-2 focus:ring-pitch-500/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-neon-sm transition-all hover:shadow-neon disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-500">
            <Activity className="h-3.5 w-3.5 text-pitch-500" />
            GoalZone Admin
          </div>
        </div>
      </div>
    </div>
  );
}
