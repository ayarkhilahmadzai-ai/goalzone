import type { Team } from '@/types';

interface TeamCrestProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
};

export default function TeamCrest({ team, size = 'md' }: TeamCrestProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold ring-2 ring-white/10 ${sizes[size]}`}
      style={{ background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)` }}
    >
      <span className="text-ink-950 drop-shadow">{team.short}</span>
    </div>
  );
}
