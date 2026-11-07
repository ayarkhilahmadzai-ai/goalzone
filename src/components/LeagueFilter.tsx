import type { League } from '@/types';

interface LeagueFilterProps {
  leagues: League[];
  active: string;
  onChange: (id: string) => void;
}

export default function LeagueFilter({ leagues, active, onChange }: LeagueFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {leagues.map((league) => {
        const isActive = league.id === active;
        return (
          <button
            key={league.id}
            onClick={() => onChange(league.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
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
