import { renderHook, act } from "@testing-library/react";
import { useExecutionStream } from "../hooks/useExecutionStream";
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

import { randomUUID } from "crypto";
if (!global.crypto) {
  global.crypto = {} as any;
}
global.crypto.randomUUID = randomUUID;

const mockSetMessages = jest.fn();
const mockSetTimelineEvents = jest.fn();
const mockSetIsStreaming = jest.fn();
const mockSetAbortController = jest.fn();
const mockRefetchExecutions = jest.fn();

jest.mock("../playground-provider", () => ({
  usePlayground: () => ({
    selectedAgent: { id: "agent-1", name: "Agent Test" },
    setMessages: (cb: any) => {
      // Simulate react state updater function call
      const dummyPrev = [
        { id: "1", role: "user", content: "hello", completed: true },
        { id: "2", role: "assistant", content: "", completed: false },
      ];
      const res = typeof cb === "function" ? cb(dummyPrev) : cb;
      mockSetMessages(res);
    },
    setTimelineEvents: mockSetTimelineEvents,
    setIsStreaming: mockSetIsStreaming,
    setAbortController: mockSetAbortController,
    refetchExecutions: mockRefetchExecutions,
  }),
}));

describe("Playground Stream Integration Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully execute stream fetch reader and emit parsed token updates", async () => {
    // Mock global fetch stream reader
    const mockReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          value: new TextEncoder().encode('event: token\ndata: {"text":"hello world"}\n\n'),
          done: false,
        })
        .mockResolvedValueOnce({
          value: new TextEncoder().encode("event: done\ndata: {}\n\n"),
          done: true,
        }),
    };

    const mockReadableStream = {
      getReader: () => mockReader,
    };

    global.fetch = jest.fn().mockResolvedValue({
      body: mockReadableStream,
    });

    const { result } = renderHook(() => useExecutionStream());

    await act(async () => {
      await result.current.executeStream("hello");
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(mockSetTimelineEvents).toHaveBeenCalled();
    expect(mockSetMessages).toHaveBeenCalled();
  });
});
