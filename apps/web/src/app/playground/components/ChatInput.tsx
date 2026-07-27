"use client";

import React, { useState, useEffect } from "react";
import { Send, StopCircle, Trash2 } from "lucide-react";
import { usePlayground } from "../hooks/usePlayground";
import { useExecutionStream } from "../hooks/useExecutionStream";

export default function ChatInput() {
  const {
    isStreaming,
    selectedAgent,
    abortController,
    clearConversation,
    setMessages,
    setTimelineEvents,
  } = usePlayground();

  const { executeStream } = useExecutionStream();
  const [input, setInput] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming || !selectedAgent) return;
    executeStream(input);
    setInput("");
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter -> Submit
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      // Esc -> Abort stream
      if (e.key === "Escape" && isStreaming && abortController) {
        e.preventDefault();
        abortController.abort();
      }
      // Ctrl+L -> Clear conversation
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        clearConversation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, isStreaming, abortController, selectedAgent]);

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  return (
    <div className="p-4 border-t border-white/[0.06] bg-black/20">
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={clearConversation}
          title="Clear Conversation (Ctrl+L)"
          className="h-11 w-11 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] text-zinc-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            disabled={!selectedAgent}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-11 pl-4 pr-12 rounded-lg border border-white/[0.08] bg-zinc-950 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
            placeholder={
              selectedAgent
                ? "Message agent... (Press Ctrl+Enter to execute, Esc to cancel)"
                : "Select an agent first to start testing..."
            }
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={handleCancel}
              title="Cancel Execution (Esc)"
              className="absolute right-2 top-1.5 h-8 w-8 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 flex items-center justify-center transition-colors"
            >
              <StopCircle className="h-4.5 w-4.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !selectedAgent}
              className="absolute right-2 top-1.5 h-8 w-8 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-md shadow-indigo-500/10 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
      <div className="flex justify-center mt-2 text-[10px] text-zinc-600 gap-4">
        <span><kbd className="bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06]">Ctrl + Enter</kbd> Execute</span>
        <span><kbd className="bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06]">Esc</kbd> Cancel</span>
        <span><kbd className="bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06]">Ctrl + L</kbd> Clear</span>
      </div>
    </div>
  );
}
