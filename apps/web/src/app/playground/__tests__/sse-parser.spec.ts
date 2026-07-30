import { parseSseChunk } from "../utils/sse-parser";

describe("Playground SSE Parser", () => {
  it("should parse a single complete SSE event", () => {
    const chunk = "event: start\ndata: {\"executionId\":\"12345\"}\n\n";
    const result = parseSseChunk(chunk);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      event: "start",
      data: { executionId: "12345" },
    });
  });

  it("should parse multiple complete SSE events in a single network chunk", () => {
    const chunk = "event: start\ndata: {\"executionId\":\"123\"}\n\nevent: token\ndata: {\"text\":\"hello\"}\n\n";
    const result = parseSseChunk(chunk);
    expect(result).toHaveLength(2);
    expect(result[0].event).toBe("start");
    expect(result[1].event).toBe("token");
    expect(result[1].data.text).toBe("hello");
  });

  it("should retain incomplete trailing data in parser loops", () => {
    // Standard buffer simulation: split across multiple chunks
    let buffer = 'event: token\ndata: {"text":"hello'; // incomplete JSON
    let result = parseSseChunk(buffer);
    // Buffer contains no empty boundary line, so it doesn't dispatch yet
    expect(result).toHaveLength(0);

    // Complete the buffer
    buffer += ' world"}\n\n';
    result = parseSseChunk(buffer);
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe("token");
    expect(result[0].data.text).toBe("hello world");
  });

  it("should gracefully handle invalid JSON data payloads and return raw strings without crashing", () => {
    const chunk = "event: token\ndata: {invalid json}\n\n";
    const result = parseSseChunk(chunk);
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe("token");
    expect(result[0].data).toBe("{invalid json}");
  });

  it("should map start, prompt, memory, tool, and tool-result events correctly", () => {
    const chunk = `
event: start
data: {"executionId":"ex-1"}

event: prompt
data: {"promptVersionId":"v1","systemPrompt":"sys","renderedPrompt":"user"}

event: memory
data: {"strategy":"SLIDING_WINDOW","budget":4096}

event: tool
data: {"toolId":"calculator","arguments":{}}

event: tool-result
data: {"toolId":"calculator","output":4,"status":"SUCCESS","durationMs":15}
\n`;
    const result = parseSseChunk(chunk);
    expect(result).toHaveLength(5);
    expect(result[0].event).toBe("start");
    expect(result[1].data.systemPrompt).toBe("sys");
    expect(result[2].data.strategy).toBe("SLIDING_WINDOW");
    expect(result[3].data.toolId).toBe("calculator");
    expect(result[4].data.status).toBe("SUCCESS");
  });
});
