"use client";

import React from "react";
import { BrainCircuit, Library } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function MemoryInspector() {
  const { timelineEvents } = usePlayground();

  const memoryEv = timelineEvents.find((e) => e.type === "memory") as any;

  if (!memoryEv) {
    return (
      <div className="text-zinc-500 text-xs py-8 text-center">
        Memory context not initialized.
      </div>
    );
  }

  const budget = memoryEv.budget || 4096;
  const reserved = memoryEv.reserved || 0;
  const remaining = memoryEv.remaining || budget;
  const used = budget - remaining;
  const usePercentage = Math.min(100, Math.max(0, (used / budget) * 100));

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-white">Conversation Memory Audit</h3>

      {/* Memory Config */}
      <div className="p-3 rounded-lg border border-white/[0.04] bg-zinc-950 font-mono text-[10px] text-zinc-400 space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-500">Strategy</span>
          <span className="text-indigo-400 font-bold">{memoryEv.strategy || "SLIDING_WINDOW"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Token Budget Limit</span>
          <span className="text-white">{budget} tokens</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Trimmed Messages</span>
          <span className="text-red-400">{memoryEv.trimmedCount || 0}</span>
        </div>
      </div>

      {/* Token Progress Bar Visualization */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
          <span>Context Utilization</span>
          <span>{used} / {budget} Tokens ({usePercentage.toFixed(0)}%)</span>
        </div>
        <div className="w-full h-3 bg-zinc-950 border border-white/[0.06] rounded-full overflow-hidden flex">
          <div
            style={{ width: `${usePercentage}%` }}
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-md shadow-indigo-500/50"
          />
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] text-[10px] text-zinc-400 leading-relaxed space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
          Memory Isolation Safeguards
        </div>
        <p>
          Before running LLM model calls, the Memory provider truncates old conversational message turns exceeding the active token budget, preventing context window bloating.
        </p>
      </div>
    </div>
  );
}
