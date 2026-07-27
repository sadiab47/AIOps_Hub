"use client";

import React from "react";
import { Play, RotateCcw, FastForward, Clock } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function ReplayViewer() {
  const { replayMode, replaySpeed, setReplaySpeed, clearConversation } = usePlayground();

  if (!replayMode) return null;

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 flex-shrink-0 animate-pulse">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
        <Play className="h-3.5 w-3.5 fill-indigo-400" />
        <span>REPLAYING</span>
      </div>

      <div className="flex items-center gap-1 border-l border-indigo-500/20 pl-3">
        <span className="text-[10px] text-zinc-500 mr-1.5">Speed</span>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => setReplaySpeed(s)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold transition-all ${
              replaySpeed === s
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        onClick={clearConversation}
        className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 border-l border-indigo-500/20 pl-3 transition-colors ml-1"
        title="Exit Replay Mode"
      >
        <RotateCcw className="h-3 w-3" />
        <span>Exit</span>
      </button>
    </div>
  );
}
