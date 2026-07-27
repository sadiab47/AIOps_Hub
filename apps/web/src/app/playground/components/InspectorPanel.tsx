"use client";

import React from "react";
import { Cpu, Terminal, Layers, ShieldAlert, CpuIcon, Hammer, Code2 } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";
import MetricsInspector from "./MetricsInspector";
import PromptInspector from "./PromptInspector";
import MemoryInspector from "./MemoryInspector";
import ProviderInspector from "./ProviderInspector";
import ToolInspector from "./ToolInspector";
import RawEventsInspector from "./RawEventsInspector";

export default function InspectorPanel() {
  const { activeTab, setActiveTab, timelineEvents } = usePlayground();

  const tabs = [
    { id: "metrics", label: "Metrics", icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "prompt", label: "Prompt", icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "memory", label: "Memory", icon: <CpuIcon className="h-3.5 w-3.5" /> },
    { id: "provider", label: "Provider", icon: <Terminal className="h-3.5 w-3.5" /> },
    { id: "tools", label: "Tools", icon: <Hammer className="h-3.5 w-3.5" /> },
    { id: "raw", label: "Raw Events", icon: <Code2 className="h-3.5 w-3.5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "metrics":
        return <MetricsInspector />;
      case "prompt":
        return <PromptInspector />;
      case "memory":
        return <MemoryInspector />;
      case "provider":
        return <ProviderInspector />;
      case "tools":
        return <ToolInspector />;
      case "raw":
        return <RawEventsInspector />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l border-white/[0.06] bg-black/10 flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Tabs Header */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-none bg-black/35 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[64px] py-3 text-[10px] font-medium transition-all flex flex-col items-center gap-1 border-b-2 hover:text-white ${
              activeTab === tab.id
                ? "border-indigo-500 text-white bg-indigo-500/5"
                : "border-transparent text-zinc-500"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {timelineEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 text-zinc-600 text-xs">
            No execution data to inspect. Run an agent execution loop.
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}
