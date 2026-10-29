import { Radio } from 'lucide-react';
import type { Match } from '@/types';
import { formatTimeShort } from '@/data';
import TeamCrest from './TeamCrest';

interface LiveTickerProps {
  matches: Match[];
  onSelect: (id: string) => void;
}

export default function LiveTicker({ matches, onSelect }: LiveTickerProps) {
  if (matches.length === 0) return null;
  const items = [...matches, ...matches]; // duplicate for seamless loop

  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-ink-900/80">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-ink-900 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-ink-900 to-transparent" />
      <div className="flex w-max animate-ticker">
        {items.map((m, i) => (
          <button
            key={`${m.id}-${i}`}
            onClick={() => onSelect(m.id)}
            className="flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-pitch-400">
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
              <span className="text-[10px] font-bold uppercase">{m.minute}&apos;</span>
            </span>
            <span className="flex items-center gap-1.5 text-ink-200">
              <TeamCrest team={m.home} size="sm" />
              {m.home.short}
            </span>
            <span className="font-bold tabular-nums text-white">
              {m.homeScore} - {m.awayScore}
            </span>
            <span className="flex items-center gap-1.5 text-ink-200">
              {m.away.short}
              <TeamCrest team={m.away} size="sm" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
