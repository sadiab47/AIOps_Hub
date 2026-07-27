"use client";

import React from "react";
import { PlayCircle, ShieldAlert, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";
import TimelineNode from "./TimelineNode";

export default function ExecutionTimeline() {
  const { timelineEvents, isStreaming } = usePlayground();

  if (timelineEvents.length === 0) {
    return (
      <div className="h-14 border-t border-white/[0.06] bg-black/20 px-6 flex items-center justify-center text-xs text-zinc-500 font-mono">
        No active execution trace to display. Run a prompt to view timeline.
      </div>
    );
  }

  // Identify status of each phase based on timeline event store log
  const hasEvent = (type: string) => timelineEvents.some((e) => e.type === type);
  const getEvent = (type: string) => timelineEvents.find((e) => e.type === type);

  const startEv = getEvent("start") as any;
  const promptEv = getEvent("prompt") as any;
  const memoryEv = getEvent("memory") as any;
  const toolEv = getEvent("tool") as any;
  const toolResultEv = getEvent("tool-result") as any;
  const usageEv = getEvent("usage") as any;
  const errorEv = getEvent("error") as any;
  const doneEv = getEvent("done") as any;

  return (
    <div className="h-20 border-t border-white/[0.06] bg-black/30 px-6 flex items-center gap-4 overflow-x-auto relative">
      <div className="flex items-center gap-2 flex-shrink-0 pr-4 border-r border-white/[0.06]">
        <PlayCircle className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-semibold text-white">Trace Pipeline</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Start Node */}
        <TimelineNode
          label="Start"
          status={doneEv || errorEv ? "success" : isStreaming ? "loading" : "success"}
          duration={0}
        />
        <ArrowRight className="h-3 w-3 text-zinc-700" />

        {/* Prompt Rendered Node */}
        <TimelineNode
          label="Prompt"
          status={promptEv ? "success" : isStreaming && !hasEvent("prompt") ? "loading" : "pending"}
          duration={0}
        />
        <ArrowRight className="h-3 w-3 text-zinc-700" />

        {/* Memory Build Node */}
        <TimelineNode
          label="Memory"
          status={memoryEv ? "success" : isStreaming && !hasEvent("memory") ? "loading" : "pending"}
          duration={0}
        />
        <ArrowRight className="h-3 w-3 text-zinc-700" />

        {/* Tool Call / execution loops (Optional) */}
        {hasEvent("tool") && (
          <>
            <TimelineNode
              label={toolEv?.toolId || "Tool"}
              status={
                toolResultEv
                  ? toolResultEv.status === "ERROR"
                    ? "error"
                    : "success"
                  : "loading"
              }
              duration={toolResultEv?.durationMs || 0}
            />
            <ArrowRight className="h-3 w-3 text-zinc-700" />
          </>
        )}

        {/* Streaming LLM Token Generation Node */}
        <TimelineNode
          label="LLM Tokens"
          status={
            doneEv || errorEv
              ? "success"
              : isStreaming && hasEvent("token")
                ? "loading"
                : "pending"
          }
          duration={0}
        />
        <ArrowRight className="h-3 w-3 text-zinc-700" />

        {/* Usage Telemetry Summary */}
        <TimelineNode
          label="Metrics"
          status={usageEv ? "success" : errorEv ? "error" : "pending"}
          duration={usageEv?.latencyMs || 0}
        />
      </div>

      {errorEv && (
        <div className="ml-auto flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex-shrink-0 font-mono">
          <ShieldAlert className="h-4 w-4" />
          {errorEv.message || "Failed"}
        </div>
      )}

      {doneEv && (
        <div className="ml-auto flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg flex-shrink-0 font-mono">
          <CheckCircle2 className="h-4 w-4" />
          Done
        </div>
      )}
    </div>
  );
}
