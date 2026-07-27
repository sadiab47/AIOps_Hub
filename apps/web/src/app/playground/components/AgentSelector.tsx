"use client";

import React from "react";
import { Bot, ChevronDown } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";

export default function AgentSelector() {
  const { agents, selectedAgent, setSelectedAgent, isStreaming, clearConversation } = usePlayground();

  const handleSelect = (agentId: string) => {
    if (isStreaming) return;
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      clearConversation();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center">
        <Bot className="h-5 w-5 text-indigo-400" />
      </div>
      <div className="relative">
        <select
          value={selectedAgent?.id || ""}
          disabled={isStreaming}
          onChange={(e) => handleSelect(e.target.value)}
          className="appearance-none h-9 pl-3 pr-9 rounded-lg border border-white/[0.08] bg-zinc-950 text-white text-xs font-medium focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.versions?.[0]?.model || "Unknown Model"})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}
