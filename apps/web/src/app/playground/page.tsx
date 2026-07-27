"use client";

import React from "react";
import ConsoleLayout from "../../components/console-layout";
import { PlaygroundProvider } from "./playground-provider";
import AgentSelector from "./components/AgentSelector";
import ExecutionHistory from "./components/ExecutionHistory";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import ExecutionTimeline from "./components/ExecutionTimeline";
import InspectorPanel from "./components/InspectorPanel";
import ReplayViewer from "./components/ReplayViewer";

export default function PlaygroundPage() {
  return (
    <PlaygroundProvider>
      <ConsoleLayout>
        <div className="h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-white/[0.06] bg-zinc-950/40 backdrop-blur-md overflow-hidden relative">
          
          {/* Top Bar Header */}
          <div className="h-14 border-b border-white/[0.06] bg-black/35 px-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-sm font-extrabold tracking-tight text-white uppercase font-mono">
                AI IDE Playground
              </h1>
              <span className="h-4 w-[1px] bg-white/[0.06]"></span>
              <AgentSelector />
            </div>
            
            <div className="flex items-center gap-3">
              <ReplayViewer />
              <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.02] border border-white/[0.06] px-2 py-1 rounded">
                v0.4.0-beta1
              </span>
            </div>
          </div>

          {/* Main workspace layout split into three panels */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Execution Logs History */}
            <ExecutionHistory />

            {/* Center: Live Conversation area */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-black/10">
              <ChatWindow />
              <ChatInput />
            </div>

            {/* Right: Telemetry & Memory Inspector Panels */}
            <InspectorPanel />
          </div>

          {/* Bottom Bar: CI/CD Pipeline Traces Timeline */}
          <ExecutionTimeline />

        </div>
      </ConsoleLayout>
    </PlaygroundProvider>
  );
}
