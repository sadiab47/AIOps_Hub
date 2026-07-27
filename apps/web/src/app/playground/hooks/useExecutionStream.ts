"use client";

import { usePlayground } from "../playground-provider";
import { parseSseChunk } from "../utils/sse-parser";
import { ExecutionEvent } from "../types/execution-event";
import { PlaygroundMessage } from "../types/playground-message";

export function useExecutionStream() {
  const {
    selectedAgent,
    setMessages,
    setTimelineEvents,
    setIsStreaming,
    setAbortController,
    refetchExecutions,
  } = usePlayground();

  const executeStream = async (input: string) => {
    if (!selectedAgent) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsStreaming(true);
    setTimelineEvents([]);

    // 1. Add User Message
    const userMsgId = crypto.randomUUID();
    const userMessage: PlaygroundMessage = {
      id: userMsgId,
      role: "user",
      content: input,
      completed: true,
    };

    // 2. Add empty streaming Assistant Message
    const assistantMsgId = crypto.randomUUID();
    const assistantMessage: PlaygroundMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      completed: false,
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const activeOrgId = localStorage.getItem("active_org_id") || "";
      const response = await fetch(
        `http://localhost:3001/api/v1/ai/agents/${selectedAgent.id}/execute/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": activeOrgId,
          },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        }
      );

      if (!response.body) {
        throw new Error("No readable stream response body received from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = parseSseChunk(buffer);

        // Keep last incomplete segment in buffer
        const lastBoundary = buffer.lastIndexOf("\n\n");
        if (lastBoundary !== -1) {
          buffer = buffer.substring(lastBoundary + 2);
        }

        for (const ev of events) {
          // Process event
          const timestamp = new Date().toISOString();
          const executionId = assistantMsgId; // Bind trace to assistant message id

          // Map dynamic raw payloads into typed Timeline Event Store
          const mappedEvent: ExecutionEvent = {
            id: crypto.randomUUID(),
            timestamp,
            executionId,
            type: ev.event as any,
            ...ev.data,
          };

          setTimelineEvents((prev) => [...prev, mappedEvent]);

          if (ev.event === "token") {
            const tokenText = ev.data?.text || "";
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + tokenText }
                  : msg
              )
            );
          } else if (ev.event === "error") {
            const errMsg = ev.data?.message || "Execution exception occurred.";
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: errMsg, completed: true, streaming: false }
                  : msg
              )
            );
          } else if (ev.event === "done") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, completed: true, streaming: false }
                  : msg
              )
            );
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + "\n[Execution cancelled by user]", completed: true, streaming: false }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `Error: ${err.message}`, completed: true, streaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
      refetchExecutions();
    }
  };

  return { executeStream };
}
