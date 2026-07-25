import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.005] text-center flex flex-col items-center justify-center">
      <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.06] mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
