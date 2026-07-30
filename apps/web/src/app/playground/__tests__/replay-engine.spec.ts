import { renderHook } from "@testing-library/react";
import { useReplay } from "../hooks/useReplay";
import api from "../../../components/api";
import { randomUUID } from "crypto";

if (!global.crypto) {
  global.crypto = {} as any;
}
global.crypto.randomUUID = randomUUID;

const mockSetMessages = jest.fn();
const mockSetTimelineEvents = jest.fn();
const mockSetIsStreaming = jest.fn();
const mockSetReplayMode = jest.fn();
let mockReplaySpeed = 1;

jest.mock("../playground-provider", () => ({
  usePlayground: () => ({
    setMessages: mockSetMessages,
    setTimelineEvents: mockSetTimelineEvents,
    setIsStreaming: mockSetIsStreaming,
    setReplayMode: mockSetReplayMode,
    replaySpeed: mockReplaySpeed,
  }),
}));

jest.mock("../../../components/api", () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      data: {
        id: "ex-1",
        input: "Hello calculator",
        output: "Result is 4",
        latencyMs: 150,
        promptTokens: 10,
        completionTokens: 15,
        estimatedCostUsd: 0.0005,
      },
    },
  }),
}));

describe("Playground Replay Engine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockReplaySpeed = 1;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should trigger step-by-step playback timers in chronological order", async () => {
    const { result } = renderHook(() => useReplay());
    
    // Start replay
    await result.current.playExecution("ex-1");
    
    expect(mockSetReplayMode).toHaveBeenCalledWith(true);
    expect(mockSetIsStreaming).toHaveBeenCalledWith(true);
    expect(mockSetMessages).toHaveBeenCalled();

    // Fast-forward initial prompt/memory timers
    jest.advanceTimersByTime(400); // Step 1: start
    expect(mockSetTimelineEvents).toHaveBeenCalled();

    jest.advanceTimersByTime(400); // Step 2: prompt
    jest.advanceTimersByTime(400); // Step 3: memory
    
    // Fast-forward full conversation words streams recursively
    jest.runAllTimers();
    
    expect(mockSetIsStreaming).toHaveBeenCalledWith(false);
  });

  it("should adjust playback intervals based on speed multipliers", async () => {
    mockReplaySpeed = 2; // Twice as fast
    const { result } = renderHook(() => useReplay());

    await result.current.playExecution("ex-1");

    // At 2x speed, each 400ms step takes 200ms
    // Advance 500ms to guarantee start, prompt, and memory fire.
    // mockSetTimelineEvents is called once for reset [], plus once per step.
    jest.advanceTimersByTime(500); 
    expect(mockSetTimelineEvents).toHaveBeenCalledTimes(4); // reset + start + prompt + memory
  });
});
