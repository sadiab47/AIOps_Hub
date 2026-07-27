"use client";

import React from "react";
import { User, Bot } from "lucide-react";
import { PlaygroundMessage } from "../types/playground-message";

export default function ChatBubble({ message }: { message: PlaygroundMessage }) {
  const isUser = message.role === "user";

  const renderContent = (content: string) => {
    if (!content) return <span className="text-zinc-600 italic">Thinking...</span>;
    // Simple line break support
    return content.split("\n").map((line, idx) => (
      <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
        {line}
      </p>
    ));
  };

  return (
    <div className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
          isUser
            ? "border-white/[0.08] bg-white/[0.02]"
            : "border-indigo-500/20 bg-indigo-500/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-zinc-400" />
        ) : (
          <Bot className="h-4 w-4 text-indigo-400" />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-[10px] font-mono text-zinc-500 ${isUser ? "text-right" : ""}`}>
          {message.role}
        </span>
        <div
          className={`p-3.5 rounded-2xl text-xs leading-relaxed border shadow-lg ${
            isUser
              ? "border-indigo-500/30 bg-indigo-600/10 text-indigo-200 rounded-tr-none"
              : "border-white/[0.06] bg-white/[0.02] text-zinc-300 rounded-tl-none"
          }`}
        >
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
}
