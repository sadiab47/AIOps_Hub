"use client";

import React from "react";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]"></span>
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></span>
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
    </div>
  );
}
