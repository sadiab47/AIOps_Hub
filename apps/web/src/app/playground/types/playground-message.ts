export interface PlaygroundMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  executionId?: string;
  completed: boolean;
  streaming?: boolean;
}
