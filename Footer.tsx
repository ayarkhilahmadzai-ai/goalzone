import { Activity } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 bg-ink-950/60">
      <div className="container-app py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch-500 text-ink-950">
                <Activity className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold">
                Goal<span className="text-pitch-400">Zone</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-400">
              Live football scores, fixtures and authorized streams — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-12">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-300">Explore</h4>
              <ul className="space-y-2 text-sm text-ink-400">
                <li>Matches</li>
                <li>Live Scores</li>
                <li>Fixtures</li>
                <li>Leagues</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-300">Company</h4>
              <ul className="space-y-2 text-sm text-ink-400">
                <li>About</li>
                <li>Privacy</li>
                <li>Terms</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="neon-divider my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-ink-500 sm:flex-row">
          <p>© 2026 GoalZone. All rights reserved.</p>
          <p className="text-ink-400">
            Showing sample data — connect a live football data provider to go live.
          </p>
        </div>
      </div>
    </footer>
  );
}
