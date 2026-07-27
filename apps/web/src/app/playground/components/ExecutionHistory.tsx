"use client";

import React, { useState } from "react";
import { History, PlayCircle, Search, Calendar, Cpu, Clock } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";
import { useReplay } from "../hooks/useReplay";

export default function ExecutionHistory() {
  const { executions, isStreaming } = usePlayground();
  const { playExecution } = useReplay();
  const [search, setSearch] = useState("");

  const filtered = executions.filter(
    (ex) =>
      (ex.input && ex.input.toLowerCase().includes(search.toLowerCase())) ||
      (ex.output && ex.output.toLowerCase().includes(search.toLowerCase())) ||
      (ex.status && ex.status.toLowerCase().includes(search.toLowerCase()))
  );

  const groupExecutions = (list: any[]) => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    list.forEach((item) => {
      const date = new Date(item.createdAt);
      const diff = now.getTime() - date.getTime();

      if (diff < oneDay) {
        today.push(item);
      } else if (diff < 2 * oneDay) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupExecutions(filtered);

  const renderGroup = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 px-2">
          <Calendar className="h-3 w-3" />
          {title}
        </h4>
        <div className="space-y-1">
          {items.map((ex) => (
            <button
              key={ex.id}
              disabled={isStreaming}
              onClick={() => playExecution(ex.id)}
              className="w-full text-left p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] active:bg-white/[0.06] transition-all flex flex-col gap-1 disabled:opacity-50 disabled:cursor-not-allowed group relative"
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[120px]">
                  {ex.input || "No Input Prompt"}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    ex.status === "COMPLETED"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {ex.status}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 line-clamp-1">
                {ex.output || "Waiting output..."}
              </p>
              <div className="flex items-center gap-2 text-[9px] text-zinc-600 mt-1 font-mono">
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {ex.latencyMs || 0}ms
                </span>
                <span className="flex items-center gap-0.5">
                  <Cpu className="h-2.5 w-2.5" />
                  {ex.model || "unknown"}
                </span>
              </div>
              <PlayCircle className="absolute right-3 bottom-2.5 h-4 w-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-r border-white/[0.06] bg-black/20 w-64 flex-shrink-0 overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-white">Execution Logs</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-md">
          {executions.length}
        </span>
      </div>

      {/* Filter Search */}
      <div className="p-3 border-b border-white/[0.04] relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter runs..."
          className="w-full h-8 pl-8 pr-3 rounded-md border border-white/[0.06] bg-zinc-950 text-white text-xs focus:outline-none focus:border-indigo-500/40 placeholder-zinc-600"
        />
        <Search className="absolute left-5 top-5 h-3.5 w-3.5 text-zinc-600" />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600">No runs match filters</div>
        ) : (
          <>
            {renderGroup("Today", today)}
            {renderGroup("Yesterday", yesterday)}
            {renderGroup("Older Logs", older)}
          </>
        )}
      </div>
    </div>
  );
}
