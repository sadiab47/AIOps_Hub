"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Plus,
  Loader2,
  Play,
  Circle,
  Trash2,
  Edit2,
  ChevronRight,
} from "lucide-react";
import api from "../../components/api";
import ConsoleLayout from "../../components/console-layout";
import { PageHeader } from "../../components/ui/page-header";
import { EmptyState } from "../../components/ui/empty-state";
import { LoadingSkeleton } from "../../components/ui/loading-skeleton";
import { DataTable } from "../../components/ui/data-table";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

interface AgentVersion {
  id: string;
  version: number;
  model: string;
  temperature: number;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  currentVersion: number;
  revision: number;
  versions: AgentVersion[];
}

export default function Agents() {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Wizard States
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [providerConfigId, setProviderConfigId] = useState("");
  const [model, setModel] = useState("");
  const [promptVersionId, setPromptVersionId] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined);
  const [executionTimeoutMs, setExecutionTimeoutMs] = useState<
    number | undefined
  >(undefined);
  const [retryLimit, setRetryLimit] = useState<number | undefined>(undefined);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [memoryStrategyOverride, setMemoryStrategyOverride] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch registered agents
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/ai/agents");
      return res.data.data;
    },
  });

  // Fetch providers list to link configurations
  const { data: providers } = useQuery({
    queryKey: ["provider-configs"],
    queryFn: async () => {
      const res = await api.get("/ai/providers");
      return res.data.data;
    },
  });

  // Fetch prompt library to link templates
  const { data: prompts } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const res = await api.get("/ai/prompts");
      return res.data.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "enable" | "disable";
    }) => {
      const res = await api.post(`/ai/agents/${id}/${status}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/ai/agents/${deleteId}`);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleCreateAgent = async () => {
    setIsSubmitting(true);
    try {
      await api.post("/ai/agents", {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description: description || undefined,
        version: {
          providerConfigId,
          model,
          promptVersionId: promptVersionId || undefined,
          temperature,
          maxTokens: maxTokens || undefined,
          executionTimeoutMs: executionTimeoutMs || undefined,
          retryLimit: retryLimit || undefined,
          streamingEnabled,
          memoryStrategyOverride: memoryStrategyOverride || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setShowWizard(false);
      setStep(1);
      setName("");
      setSlug("");
      setDescription("");
      setProviderConfigId("");
      setModel("");
      setPromptVersionId("");
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Create agent failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Agent",
      accessor: (a: Agent) => (
        <div>
          <span className="font-bold text-white block">{a.name}</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            slug: {a.slug}
          </span>
        </div>
      ),
    },
    {
      header: "Active Version",
      accessor: (a: Agent) => (
        <span className="font-mono text-zinc-400">v{a.currentVersion}</span>
      ),
    },
    {
      header: "Revision",
      accessor: (a: Agent) => (
        <span className="font-mono text-zinc-500">rev {a.revision}</span>
      ),
    },
    {
      header: "Status",
      accessor: (a: Agent) => (
        <span
          className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
            a.status === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
              : a.status === "DRAFT"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                : "bg-zinc-500/10 text-zinc-400 border border-white/[0.08]"
          }`}
        >
          {a.status}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (a: Agent) => (
        <div className="flex items-center gap-3">
          {a.status === "ACTIVE" ? (
            <button
              onClick={() =>
                toggleStatusMutation.mutate({ id: a.id, status: "disable" })
              }
              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={() =>
                toggleStatusMutation.mutate({ id: a.id, status: "enable" })
              }
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Enable
            </button>
          )}
          <button
            onClick={() => setDeleteId(a.id)}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
            title="Archive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <PageHeader
          title="Agent Registry"
          description="Register agents, define execution models, link system prompts, and attach capabilities"
        >
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Agent Wizard
          </button>
        </PageHeader>

        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : !agents || agents.length === 0 ? (
          <EmptyState
            title="No agents registered"
            description="Create your first agent thread configuration to link models, system prompt contexts, and overrides."
            icon={Bot}
            action={
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg"
              >
                Launch Agent Wizard
              </button>
            }
          />
        ) : (
          <DataTable columns={columns} data={agents} />
        )}

        {/* Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg p-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0f] shadow-2xl relative z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-2">
                <h3 className="text-base font-bold text-white">
                  Create Agent Wizard
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Step {step} of 5
                </span>
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                      placeholder="e.g. Support Specialist"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Unique Slug (Optional)
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                      placeholder="e.g. support-specialist"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none h-20 resize-none"
                      placeholder="Goal description of this agent..."
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      AI Provider Config
                    </label>
                    <select
                      value={providerConfigId}
                      onChange={(e) => setProviderConfigId(e.target.value)}
                      className="w-full bg-[#0c0c14] border border-white/[0.08] text-xs text-white rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">Select configuration...</option>
                      {providers?.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Execution Model Key
                    </label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                      placeholder="e.g. gpt-4o, claude-3-5-sonnet-latest"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Link Library Prompt
                    </label>
                    <select
                      value={promptVersionId}
                      onChange={(e) => setPromptVersionId(e.target.value)}
                      className="w-full bg-[#0c0c14] border border-white/[0.08] text-xs text-white rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">No linked prompt...</option>
                      {prompts?.map((pr: any) => (
                        <option key={pr.id} value={pr.versions?.[0]?.id || ""}>
                          {pr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Linking a prompt ensures the agent is loaded with
                    pre-configured system instructions at execution time.
                  </p>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Temperature
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={temperature}
                        onChange={(e) =>
                          setTemperature(parseFloat(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Max Tokens (Optional)
                      </label>
                      <input
                        type="number"
                        value={maxTokens || ""}
                        onChange={(e) =>
                          setMaxTokens(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Timeout ms (Optional)
                      </label>
                      <input
                        type="number"
                        value={executionTimeoutMs || ""}
                        onChange={(e) =>
                          setExecutionTimeoutMs(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Retry Limit (Optional)
                      </label>
                      <input
                        type="number"
                        value={retryLimit || ""}
                        onChange={(e) =>
                          setRetryLimit(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="streamingEnabled"
                      checked={streamingEnabled}
                      onChange={(e) => setStreamingEnabled(e.target.checked)}
                      className="rounded border-white/[0.08] bg-white/[0.02] text-indigo-600 focus:ring-indigo-500/50"
                    />
                    <label
                      htmlFor="streamingEnabled"
                      className="text-xs text-zinc-300"
                    >
                      Enable SSE execution response streaming
                    </label>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Agent Name:</span>{" "}
                      <span className="font-semibold text-white">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Slug:</span>{" "}
                      <span className="font-mono text-zinc-300">
                        {slug || name.toLowerCase().replace(/\s+/g, "-")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Model:</span>{" "}
                      <span className="font-mono text-zinc-300">{model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Temperature:</span>{" "}
                      <span className="font-mono text-zinc-300">
                        {temperature}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Streaming:</span>{" "}
                      <span className="text-zinc-300">
                        {streamingEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-white/[0.05]">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((prev) => prev - 1)}
                  className="h-9 px-4 rounded-lg border border-white/[0.08] hover:bg-white/[0.02] text-zinc-400 text-xs font-semibold disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWizard(false);
                      setStep(1);
                    }}
                    className="h-9 px-4 rounded-lg hover:bg-white/[0.02] text-zinc-500 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={() => setStep((prev) => prev + 1)}
                      className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateAgent}
                      disabled={isSubmitting}
                      className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Create Agent
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteId !== null}
          title="Archive Agent?"
          description="This will flag this agent's status as ARCHIVED. Traces and history will remain readable but execution calls will be disabled."
          loading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </ConsoleLayout>
  );
}
