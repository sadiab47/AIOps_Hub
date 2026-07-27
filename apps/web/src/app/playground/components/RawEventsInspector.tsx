"use client";

import React from "react";
import { Code2 } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function RawEventsInspector() {
  const { timelineEvents } = usePlayground();

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="text-xs font-semibold text-white">SSE Event Traces (Raw JSON)</h3>
        <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
          {timelineEvents.length} events
        </span>
      </div>

      <div className="flex-1 p-2.5 rounded-lg border border-white/[0.04] bg-zinc-950 font-mono text-[9px] text-zinc-400 overflow-y-auto max-h-[calc(100vh-22rem)] space-y-2 whitespace-pre-wrap">
        {timelineEvents.map((ev, idx) => (
          <div key={ev.id} className="border-b border-white/[0.02] pb-2 last:border-0">
            <span className="text-indigo-400 font-bold">[{ev.type.toUpperCase()}]</span>{" "}
            <span className="text-zinc-600 font-mono">@{new Date(ev.timestamp).toLocaleTimeString()}</span>
            <pre className="mt-1 p-1 rounded bg-black/40 text-zinc-400 overflow-x-auto text-[9px]">
              {JSON.stringify(ev, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
