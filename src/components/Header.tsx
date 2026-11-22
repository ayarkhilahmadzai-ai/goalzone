import { useState } from 'react';
import { Menu, X, Activity } from 'lucide-react';

interface HeaderProps {
  onNavigate: (route: 'home' | 'fixtures' | 'live') => void;
  liveCount: number;
}

export default function Header({ onNavigate, liveCount }: HeaderProps) {
  const [open, setOpen] = useState(false);

  const links = [
    { label: 'Matches', route: 'fixtures' as const },
    { label: 'Live', route: 'live' as const, badge: liveCount },
  ];

  const go = (route: 'home' | 'fixtures' | 'live') => {
    onNavigate(route);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-lg">
      <div className="container-app flex h-16 items-center justify-between">
        <button type="button" onClick={() => go('home')} aria-label="GoalZone – startsida" className="flex items-center gap-2.5 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch-500 text-ink-950 shadow-neon-sm group-hover:shadow-neon transition-shadow">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Goal<span className="text-pitch-400">Zone</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => go(l.route)}
              className="relative min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400"
            >
              {l.label}
              {l.badge ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pitch-500 px-1.5 text-[10px] font-bold text-ink-950">
                  {l.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="goalzone-header-mobile-menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400 md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav id="goalzone-header-mobile-menu" aria-label="Huvudmeny mobil" className="border-t border-white/5 bg-ink-900 px-4 py-3 md:hidden">
          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => go(l.route)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-ink-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400"
            >
              {l.label}
              {l.badge ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pitch-500 px-1.5 text-[10px] font-bold text-ink-950">
                  {l.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
