import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  description?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-indigo-400",
  description,
}: StatCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-sm shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {label}
          </span>
          <div
            className={`p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]`}
          >
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white tracking-tight">
          {value}
        </div>
      </div>
      {description && (
        <div className="text-[10px] text-zinc-500 mt-3 font-medium">
          {description}
        </div>
      )}
    </div>
  );
}
