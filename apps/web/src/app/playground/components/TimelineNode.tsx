"use client";

import React from "react";
import { Loader2, CheckCircle2, AlertCircle, Circle } from "lucide-react";

interface TimelineNodeProps {
  label: string;
  status: "success" | "loading" | "error" | "pending";
  duration?: number;
}

export default function TimelineNode({ label, status, duration }: TimelineNodeProps) {
  const getStyles = () => {
    switch (status) {
      case "success":
        return {
          bg: "bg-green-500/10 border-green-500/30 text-green-400",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        };
      case "loading":
        return {
          bg: "bg-indigo-500/10 border-indigo-500/40 text-indigo-400",
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        };
      case "error":
        return {
          bg: "bg-red-500/10 border-red-500/30 text-red-400",
          icon: <AlertCircle className="h-3.5 w-3.5" />,
        };
      case "pending":
      default:
        return {
          bg: "bg-zinc-950 border-white/[0.06] text-zinc-600",
          icon: <Circle className="h-3.5 w-3.5" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${styles.bg}`}>
      {styles.icon}
      <span>{label}</span>
      {duration !== undefined && duration > 0 && (
        <span className="text-[9px] font-mono opacity-60 ml-1">({duration}ms)</span>
      )}
    </div>
  );
}
