"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../components/api";
import { ExecutionEvent } from "./types/execution-event";
import { PlaygroundMessage } from "./types/playground-message";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  currentVersion: number;
  versions: Array<{
    id: string;
    version: number;
    model: string;
    temperature: number;
    providerConfig: {
      provider: string;
    };
  }>;
}

interface PlaygroundContextType {
  agents: Agent[];
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  messages: PlaygroundMessage[];
  setMessages: React.Dispatch<React.SetStateAction<PlaygroundMessage[]>>;
  timelineEvents: ExecutionEvent[];
  setTimelineEvents: React.Dispatch<React.SetStateAction<ExecutionEvent[]>>;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  executions: any[];
  refetchExecutions: () => void;
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  replayMode: boolean;
  setReplayMode: (replay: boolean) => void;
  replaySpeed: number;
  setReplaySpeed: (speed: number) => void;
  clearConversation: () => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export function PlaygroundProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ExecutionEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState("metrics");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);

  // Fetch registered agents
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["playground-agents"],
    queryFn: async () => {
      const res = await api.get("/ai/agents");
      return res.data.data;
    },
  });

  // Fetch execution history for the active organization
  const { data: executions = [], refetch: refetchExecutions } = useQuery<any[]>({
    queryKey: ["playground-executions"],
    queryFn: async () => {
      const res = await api.get("/ai/agents/executions");
      return res.data.data;
    },
    enabled: true,
  });

  // Set default selected agent if none is selected
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [agents, selectedAgent]);

  const clearConversation = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setMessages([]);
    setTimelineEvents([]);
    setIsStreaming(false);
    setReplayMode(false);
  };

  return (
    <PlaygroundContext.Provider
      value={{
        agents,
        selectedAgent,
        setSelectedAgent,
        messages,
        setMessages,
        timelineEvents,
        setTimelineEvents,
        isStreaming,
        setIsStreaming,
        activeTab,
        setActiveTab,
        executions,
        refetchExecutions,
        abortController,
        setAbortController,
        replayMode,
        setReplayMode,
        replaySpeed,
        setReplaySpeed,
        clearConversation,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlayground() {
  const context = useContext(PlaygroundContext);
  if (!context) {
    throw new Error("usePlayground must be used within a PlaygroundProvider");
  }
  return context;
}
