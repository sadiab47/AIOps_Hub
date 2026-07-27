"use client";

import { usePlayground } from "../playground-provider";
import api from "../../../components/api";
import { ExecutionEvent } from "../types/execution-event";
import { PlaygroundMessage } from "../types/playground-message";

export function useReplay() {
  const {
    setMessages,
    setTimelineEvents,
    setIsStreaming,
    setReplayMode,
    replaySpeed,
  } = usePlayground();

  const playExecution = async (executionId: string) => {
    setReplayMode(true);
    setIsStreaming(true);
    setTimelineEvents([]);
    setMessages([]);

    try {
      const res = await api.get(`/ai/agents/executions/${executionId}`);
      const ex = res.data.data;

      // 1. Replay User Message
      const userMsg: PlaygroundMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: ex.input || "",
        completed: true,
      };
      setMessages([userMsg]);

      // 2. Generate simulated steps
      const steps: Array<{ event: string; data: any }> = [];

      steps.push({
        event: "start",
        data: { executionId },
      });

      steps.push({
        event: "prompt",
        data: {
          promptVersionId: ex.promptVersionId || "v0.1.0-default",
          variables: { input: ex.input || "" },
          systemPrompt: "You are an intelligent operations assistant configured on AIOps Hub.",
          renderedPrompt: `User input: ${ex.input}`,
        },
      });

      steps.push({
        event: "memory",
        data: {
          strategy: "SLIDING_WINDOW",
          reserved: 1024,
          remaining: 3072,
          budget: 4096,
          trimmedCount: 0,
        },
      });

      // Check if this execution generated any tool invocation pattern
      if (ex.input && (ex.input.includes("TOOL") || ex.input.includes("SUCCESS") || ex.input.includes("calculator"))) {
        steps.push({
          event: "tool",
          data: {
            toolId: "calculator",
            arguments: { expression: "2+2" },
            callId: "call-calc-replay",
          },
        });
        steps.push({
          event: "tool-result",
          data: {
            toolId: "calculator",
            output: { result: 4 },
            durationMs: 12,
            status: "SUCCESS",
          },
        });
      }

      // 3. Token streams chunks split by words
      const words = (ex.output || "Mocked response output completed.").split(" ");
      
      // 4. Usage summary metrics
      steps.push({
        event: "usage",
        data: {
          promptTokens: ex.promptTokens || 12,
          completionTokens: ex.completionTokens || 15,
          latencyMs: ex.latencyMs || 250,
          estimatedCostUsd: ex.estimatedCostUsd || 0.0005,
        },
      });

      steps.push({
        event: "done",
        data: {},
      });

      // Build intermediate event trigger timeline
      let stepIndex = 0;
      const baseDelay = 400; // ms
      const delayMultiplier = 1 / replaySpeed;

      const assistantMsgId = crypto.randomUUID();
      const assistantMessage: PlaygroundMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        completed: false,
        streaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const runNextStep = () => {
        if (stepIndex >= steps.length) {
          setIsStreaming(false);
          return;
        }

        const step = steps[stepIndex];
        const timestamp = new Date().toISOString();
        const mappedEvent: ExecutionEvent = {
          id: crypto.randomUUID(),
          timestamp,
          executionId,
          type: step.event as any,
          ...step.data,
        };

        setTimelineEvents((prev) => [...prev, mappedEvent]);

        if (step.event === "done") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, completed: true, streaming: false }
                : msg
            )
          );
          setIsStreaming(false);
          return;
        }

        stepIndex++;
        
        // If it's prompt/memory/tool stage, schedule next step
        setTimeout(runNextStep, baseDelay * delayMultiplier);
      };

      // Play start immediately
      runNextStep();

      // Stream the words independently to simulate real typing speed
      let wordIndex = 0;
      const streamWords = () => {
        if (wordIndex >= words.length) {
          return;
        }
        const word = words[wordIndex] + (wordIndex === words.length - 1 ? "" : " ");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + word }
              : msg
          )
        );
        wordIndex++;
        setTimeout(streamWords, (120 + Math.random() * 80) * delayMultiplier);
      };

      // Start token streaming after 1.2s delay (simulating LLM thinking)
      setTimeout(streamWords, 1200 * delayMultiplier);

    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: `Replay failed: ${err.message}`, completed: true },
      ]);
      setIsStreaming(false);
    }
  };

  return { playExecution };
}
