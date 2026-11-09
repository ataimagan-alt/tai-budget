import React from 'react';

/**
 * Цветной бейдж участника семьи (Папа, Мама, Мансур, Алишер, Ахмад)
 */
export default function MemberBadge({ member, size = 'sm' }) {
  if (!member) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
        —
      </span>
    );
  }

  const color = member.color || '#3B82F6';
  const sizeClass = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClass}`}
      style={{ backgroundColor: `${color}1F`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {member.name}
    </span>
  );
}
