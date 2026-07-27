"use client";

import React, { useEffect, useRef } from "react";
import { Terminal, Cpu } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow() {
  const { messages, selectedAgent, isStreaming } = usePlayground();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
          <div className="h-12 w-12 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 flex items-center justify-center mb-4">
            <Terminal className="h-6 w-6 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Playground Ready</h3>
          <p className="text-xs text-zinc-500 mt-2">
            Selected agent: <span className="text-indigo-400 font-mono font-medium">{selectedAgent?.name || "None"}</span>
          </p>
          <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
            Enter a prompt below. The execution runtime will parse memory constraints, call provider LLMs, run custom tools, and stream responses back in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 max-w-3xl">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center border border-indigo-500/20 bg-indigo-500/10 flex-shrink-0">
                <Cpu className="h-4 w-4 text-indigo-400 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500">assistant</span>
                <div className="p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] rounded-tl-none">
                  <TypingIndicator />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      )}
    </div>
  );
}
