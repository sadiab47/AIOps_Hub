"use client";

import React, { useState } from "react";
import { Terminal, Send, Bot, User, Sparkles } from "lucide-react";
import ConsoleLayout from "../../components/console-layout";

export default function Playground() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      {
        role: "assistant",
        text: `You said: "${input}". The execution engine (AGENT-003) will connect this playground to real provider runtimes in the next phase!`,
      },
    ]);
    setInput("");
  };

  return (
    <ConsoleLayout>
      <div className="h-[calc(100vh-12rem)] flex flex-col justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Playground
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Interactively run and debug agent configurations
          </p>
        </div>

        {/* Chat Window */}
        <div className="flex-1 my-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Terminal className="h-8 w-8 text-zinc-600 mb-3" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  Playground ready
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Type a message below to test inputs. Responses will run mocks
                  until the execution engine is built.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-3xl ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                      m.role === "user"
                        ? "border-white/[0.08] bg-white/[0.02]"
                        : "border-indigo-500/20 bg-indigo-500/10"
                    }`}
                  >
                    {m.role === "user" ? (
                      <User className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <Bot className="h-4 w-4 text-indigo-400" />
                    )}
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                      m.role === "user"
                        ? "border-indigo-500/30 bg-indigo-600/10 text-indigo-200 rounded-tr-none"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-300 rounded-tl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="relative mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-12 pl-4 pr-12 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="Send a test message to the execution runtime..."
            />
            <button
              type="submit"
              className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/25"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </ConsoleLayout>
  );
}
