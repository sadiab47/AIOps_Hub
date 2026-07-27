export interface ParsedSseMessage {
  event: string;
  data: any;
}

export function parseSseChunk(text: string): ParsedSseMessage[] {
  const lines = text.split("\n");
  const messages: ParsedSseMessage[] = [];
  
  let currentEvent = "";
  let currentData = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line indicates event boundary
      if (currentEvent || currentData) {
        try {
          const parsedData = currentData ? JSON.parse(currentData) : null;
          messages.push({ event: currentEvent || "message", data: parsedData });
        } catch (e) {
          // Fallback to string if not JSON
          messages.push({ event: currentEvent || "message", data: currentData });
        }
        currentEvent = "";
        currentData = "";
      }
      continue;
    }

    if (trimmed.startsWith("event:")) {
      currentEvent = trimmed.replace("event:", "").trim();
    } else if (trimmed.startsWith("data:")) {
      currentData = trimmed.replace("data:", "").trim();
    }
  }

  return messages;
}
