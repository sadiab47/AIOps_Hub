'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cpu, Plus, Loader2, Play, Check, Trash2, Edit2, Copy } from 'lucide-react';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';
import { PageHeader } from '../../components/ui/page-header';
import { StatCard } from '../../components/ui/stat-card';
import { EmptyState } from '../../components/ui/empty-state';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton';
import { DataTable } from '../../components/ui/data-table';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

interface ProviderConfig {
  id: string;
  provider: string;
  name: string;
  defaultModel: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export default function Providers() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: configs, isLoading } = useQuery<ProviderConfig[]>({
    queryKey: ['provider-configs'],
    queryFn: async () => {
      const res = await api.get('/ai/providers');
      return res.data.data;
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/ai/providers/${id}/validate`);
      return res.data;
    },
    onSuccess: (data) => {
      alert(`Validation result: ${data.success ? 'Credentials Valid!' : 'Validation failed.'}`);
    },
    onError: (err: any) => {
      alert(`Validation error: ${err.response?.data?.error?.message || err.message}`);
    },
  });

  const defaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/ai/providers/${id}/default`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (config: ProviderConfig) => {
      const res = await api.post('/ai/providers', {
        name: `${config.name} (Copy)`,
        provider: config.provider,
        credentials: { apiKey: 'PLACEHOLDER_KEY_REPLACE_ME' }, // Require key input on copies
        defaultModel: config.defaultModel,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/ai/providers/${deleteId}`);
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/ai/providers', {
        name,
        provider,
        credentials: { apiKey },
        defaultModel: defaultModel || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
      setShowAddModal(false);
      setName('');
      setApiKey('');
      setDefaultModel('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Create provider config failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Provider',
      accessor: (c: ProviderConfig) => <span className="font-mono font-semibold text-zinc-400">{c.provider}</span>,
    },
    {
      header: 'Name',
      accessor: (c: ProviderConfig) => <span className="font-bold text-white">{c.name}</span>,
    },
    {
      header: 'Default Model',
      accessor: (c: ProviderConfig) => <span className="text-zinc-400">{c.defaultModel || 'Not Set'}</span>,
    },
    {
      header: 'Default',
      accessor: (c: ProviderConfig) => (
        c.isDefault ? (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
            Default
          </span>
        ) : (
          <button
            onClick={() => defaultMutation.mutate(c.id)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold"
          >
            Set Default
          </button>
        )
      ),
    },
    {
      header: 'Actions',
      accessor: (c: ProviderConfig) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => validateMutation.mutate(c.id)}
            className="p-1.5 rounded-md hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-colors"
            title="Test Connection"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => duplicateMutation.mutate(c)}
            className="p-1.5 rounded-md hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-colors"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteId(c.id)}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
            title="Delete"
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
          title="AI Providers"
          description="Configure and manage connection credentials for OpenAI, Anthropic, Gemini, or Ollama"
        >
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Provider
          </button>
        </PageHeader>

        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : !configs || configs.length === 0 ? (
          <EmptyState
            title="No providers configured"
            description="Add your first AI provider connection keys to enable execution capabilities for registry agents."
            icon={Cpu}
            action={
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg"
              >
                Configure First Provider
              </button>
            }
          />
        ) : (
          <DataTable columns={columns} data={configs} />
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-md p-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0f] shadow-2xl relative z-10 space-y-4">
              <h3 className="text-base font-bold text-white">Add Provider Configuration</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                    placeholder="e.g. OpenAI Production"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Provider</label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    className="w-full bg-[#0c0c14] border border-white/[0.08] text-xs text-white rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="OPENAI">OpenAI</option>
                    <option value="ANTHROPIC">Anthropic</option>
                    <option value="GOOGLE">Google Gemini</option>
                    <option value="OLLAMA">Ollama (Local)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">API Key / Token</label>
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-750 outline-none"
                    placeholder="sk-••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Default Model (Optional)</label>
                  <input
                    type="text"
                    value={defaultModel}
                    onChange={e => setDefaultModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                    placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-9 px-4 rounded-lg border border-white/[0.08] hover:bg-white/[0.02] text-zinc-400 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Config
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteId !== null}
          title="Delete Provider Configuration?"
          description="This will clear API connection credentials permanently. Agents targeting this provider will fail execution calls."
          loading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </ConsoleLayout>
  );
}
