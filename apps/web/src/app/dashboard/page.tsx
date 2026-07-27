"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Terminal,
  Activity,
  DollarSign,
  Bot,
  BookOpen,
  Layers,
} from "lucide-react";
import api from "../../components/api";
import ConsoleLayout from "../../components/console-layout";

export default function Dashboard() {
  const { data: usageSummary } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: async () => {
      const res = await api.get("/ai/usage/summary");
      return res.data.data;
    },
  });

  const stats = [
    {
      label: "Today's Cost",
      value: usageSummary?.totalCost ? `$${usageSummary.totalCost}` : "$0.00",
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      label: "Prompt Tokens",
      value: usageSummary?.totalPromptTokens || "0",
      icon: BookOpen,
      color: "text-indigo-400",
    },
    {
      label: "Completion Tokens",
      value: usageSummary?.totalCompletionTokens || "0",
      icon: Sparkles,
      color: "text-violet-400",
    },
    {
      label: "Total Executions",
      value: usageSummary?.totalRequests || "0",
      icon: Activity,
      color: "text-purple-400",
    },
  ];

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Multi-tenant telemetry overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-sm shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {label}
                </span>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="text-2xl font-extrabold text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Console info banner */}
        <div className="p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] flex items-center justify-between gap-6">
          <div>
            <h3 className="text-sm font-bold text-indigo-300">
              Milestone Phase 1 Complete
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Authentication systems, dashboard layouts, and backend health
              indicators are fully operational.
            </p>
          </div>
          <Bot className="h-10 w-10 text-indigo-400 flex-shrink-0" />
        </div>
      </div>
    </ConsoleLayout>
  );
}
