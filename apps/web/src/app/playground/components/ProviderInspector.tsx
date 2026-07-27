"use client";

import React from "react";
import { Server, Settings } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function ProviderInspector() {
  const { selectedAgent } = usePlayground();

  const activeVersion = selectedAgent?.versions?.[0];

  if (!activeVersion) {
    return (
      <div className="text-zinc-500 text-xs py-8 text-center">
        No active model version config linked.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-white">AI Provider Configuration</h3>

      <div className="p-3 rounded-lg border border-white/[0.04] bg-zinc-950 font-mono text-[10px] text-zinc-400 space-y-2.5">
        <div className="flex justify-between">
          <span className="text-zinc-500">Provider</span>
          <span className="text-white font-bold">{activeVersion.providerConfig?.provider || "OPENAI"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Model ID</span>
          <span className="text-indigo-400 font-bold">{activeVersion.model || "gpt-4o"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Temperature</span>
          <span className="text-white">{activeVersion.temperature ?? 0.7}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Streaming</span>
          <span className="text-green-400">Enabled</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Max Iterations</span>
          <span className="text-white">5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Timeout Limits</span>
          <span className="text-white">30,000ms</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] text-[10px] text-zinc-400 leading-relaxed space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Server className="h-3.5 w-3.5 text-indigo-400" />
          Active provider endpoints
        </div>
        <p>
          Model weights are processed through secure TLS execution loops. API keys are stored encrypted and decrypted on demand inside memory boundaries.
        </p>
      </div>
    </div>
  );
}
