import type { League } from '@/types';

interface LeagueFilterProps {
  leagues: League[];
  active: string;
  onChange: (id: string) => void;
}

export default function LeagueFilter({ leagues, active, onChange }: LeagueFilterProps) {
  return (
    <div role="group"
      aria-label="Filtrera matcher efter liga"
      className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {leagues.map((league) => {
        const isActive = league.id === active;
        return (
          <button
            key={league.id}
            type="button"
            onClick={() => onChange(league.id)}
            aria-pressed={isActive}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-400 text-sm font-medium transition-all ${
              isActive
                ? 'bg-pitch-500 text-ink-950 shadow-neon-sm'
                : 'border border-white/5 bg-ink-800/60 text-ink-300 hover:border-white/10 hover:text-white'
            }`}
          >
            {league.name}
          </button>
        );
      })}
    </div>
  );
}
