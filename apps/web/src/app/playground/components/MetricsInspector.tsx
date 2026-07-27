"use client";

import React from "react";
import { Cpu, DollarSign, Hourglass, HelpCircle } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function MetricsInspector() {
  const { timelineEvents } = usePlayground();

  const usageEv = timelineEvents.find((e) => e.type === "usage") as any;

  const cost = usageEv?.estimatedCostUsd ?? 0;
  const latency = usageEv?.latencyMs ?? 0;
  const promptTokens = usageEv?.promptTokens ?? 0;
  const completionTokens = usageEv?.completionTokens ?? 0;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-white">Execution Metrics</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Cost Card */}
        <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <DollarSign className="h-3.5 w-3.5 text-indigo-400" />
            <span>Estimated Cost</span>
          </div>
          <span className="text-lg font-bold font-mono text-white">
            ${cost.toFixed(5)}
          </span>
        </div>

        {/* Latency Card */}
        <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <Hourglass className="h-3.5 w-3.5 text-indigo-400" />
            <span>Execution Latency</span>
          </div>
          <span className="text-lg font-bold font-mono text-white">
            {(latency / 1000).toFixed(2)}s
          </span>
        </div>

        {/* Prompt Tokens */}
        <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <Cpu className="h-3.5 w-3.5 text-zinc-400" />
            <span>Prompt Tokens</span>
          </div>
          <span className="text-lg font-bold font-mono text-white">
            {promptTokens}
          </span>
        </div>

        {/* Completion Tokens */}
        <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>Completion Tokens</span>
          </div>
          <span className="text-lg font-bold font-mono text-white">
            {completionTokens}
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-[10px] text-zinc-400 leading-relaxed">
        <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
          <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
          Cost calculations
        </div>
        Estimations are pre-computed based on localized provider pricing catalogs for input/output model tokens.
      </div>
    </div>
  );
}
