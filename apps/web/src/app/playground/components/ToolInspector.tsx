"use client";

import React, { useState } from "react";
import { Hammer, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function ToolInspector() {
  const { timelineEvents } = usePlayground();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toolEvents = timelineEvents.filter((e) => e.type === "tool") as any[];
  const toolResultEvents = timelineEvents.filter((e) => e.type === "tool-result") as any[];

  if (toolEvents.length === 0) {
    return (
      <div className="text-zinc-500 text-xs py-8 text-center">
        No tool calls executed in the current session.
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-white">Tool Invocation Traces</h3>

      <div className="space-y-3">
        {toolEvents.map((tEv) => {
          const resultEv = toolResultEvents.find((r) => r.callId === tEv.callId);
          const isExpanded = expandedCard === tEv.id;

          return (
            <div
              key={tEv.id}
              className="rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => toggleExpand(tEv.id)}
                className="w-full p-3 flex justify-between items-center text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Hammer className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">{tEv.toolId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      resultEv
                        ? resultEv.status === "ERROR"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-green-500/10 text-green-400"
                        : "bg-indigo-500/10 text-indigo-400 animate-pulse"
                    }`}
                  >
                    {resultEv ? resultEv.status : "RUNNING"}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </div>
              </button>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="p-3 border-t border-white/[0.04] bg-black/40 space-y-3">
                  {/* Arguments */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Arguments</span>
                    <pre className="p-2 rounded bg-zinc-950 text-[10px] text-zinc-400 overflow-x-auto max-h-24">
                      {JSON.stringify(tEv.arguments, null, 2)}
                    </pre>
                  </div>

                  {/* Output */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Result Output</span>
                    <pre className="p-2 rounded bg-zinc-950 text-[10px] text-zinc-400 overflow-x-auto max-h-24">
                      {resultEv ? JSON.stringify(resultEv.output, null, 2) : "Computing..."}
                    </pre>
                  </div>

                  {/* Latency */}
                  {resultEv && (
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                      <span>Execution Time</span>
                      <span>{resultEv.durationMs}ms</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
