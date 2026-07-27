"use client";

import React, { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function PromptInspector() {
  const { timelineEvents } = usePlayground();
  const [copied, setCopied] = useState<string | null>(null);

  const promptEv = timelineEvents.find((e) => e.type === "prompt") as any;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!promptEv) {
    return (
      <div className="text-zinc-500 text-xs py-8 text-center">
        Prompt rendering context not established yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-white">Prompt Template Details</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
          {promptEv.promptVersionId || "Active Version"}
        </span>
      </div>

      {/* Rendered System Prompt */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-zinc-500">
          <span>System Prompt</span>
          <button
            onClick={() => handleCopy(promptEv.systemPrompt || "", "sys")}
            className="hover:text-white transition-colors"
          >
            {copied === "sys" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <div className="p-2.5 rounded-lg border border-white/[0.04] bg-zinc-950 font-mono text-[10px] text-zinc-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
          {promptEv.systemPrompt || "No system prompt configured."}
        </div>
      </div>

      {/* Rendered User Prompt */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-zinc-500">
          <span>Rendered Prompt (Variables Rendered)</span>
          <button
            onClick={() => handleCopy(promptEv.renderedPrompt || "", "render")}
            className="hover:text-white transition-colors"
          >
            {copied === "render" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <div className="p-2.5 rounded-lg border border-white/[0.04] bg-zinc-950 font-mono text-[10px] text-zinc-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
          {promptEv.renderedPrompt || "No rendered prompt."}
        </div>
      </div>

      {/* Variables */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-zinc-500">Render Variables</span>
        <div className="p-2.5 rounded-lg border border-white/[0.04] bg-zinc-950 font-mono text-[10px] text-zinc-400">
          {promptEv.variables && Object.keys(promptEv.variables).length > 0 ? (
            Object.entries(promptEv.variables).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/[0.02] py-1 last:border-0">
                <span className="text-indigo-400">{k}</span>
                <span className="text-zinc-300 truncate max-w-[140px]" title={v as string}>
                  {v as string}
                </span>
              </div>
            ))
          ) : (
            <span className="text-zinc-600 italic">No variables referenced.</span>
          )}
        </div>
      </div>
    </div>
  );
}
