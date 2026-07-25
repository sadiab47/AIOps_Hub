'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Loader2, Save, Trash2, Edit2, Play, Eye } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';
import { PageHeader } from '../../components/ui/page-header';
import { EmptyState } from '../../components/ui/empty-state';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton';
import { DataTable } from '../../components/ui/data-table';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  variables: string[];
  createdAt: string;
}

interface Prompt {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  versions: PromptVersion[];
}

export default function Prompts() {
  const queryClient = useQueryClient();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [activeVersionIdx, setActiveVersionIdx] = useState<number>(0);
  const [editorContent, setEditorContent] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('ORGANIZATION');
  const [type, setType] = useState('CHAT');
  const [initialContent, setInitialContent] = useState('You are a helpful assistant.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Fetch prompts list
  const { data: prompts, isLoading } = useQuery<Prompt[]>({
    queryKey: ['prompts'],
    queryFn: async () => {
      const res = await api.get('/ai/prompts');
      return res.data.data;
    },
  });

  const selectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setActiveVersionIdx(0);
    setEditorContent(prompt.versions?.[0]?.content || '');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/ai/prompts', {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description: description || undefined,
        visibility,
        type,
        content: initialContent,
      });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setShowAddModal(false);
      setName('');
      setSlug('');
      setDescription('');
      setInitialContent('You are a helpful assistant.');
      // Auto-select newly created prompt
      if (res.data?.data) {
        selectPrompt(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Create prompt template failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewVersion = async () => {
    if (!selectedPrompt) return;
    setIsSavingVersion(true);
    try {
      const res = await api.post(`/ai/prompts/${selectedPrompt.id}/versions`, {
        content: editorContent,
      });
      // Invalidate query to load fresh version history lists
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });
      
      // Update selected reference to match fresh metadata content
      const updatedList = queryClient.getQueryData<Prompt[]>(['prompts']);
      const match = updatedList?.find(p => p.id === selectedPrompt.id);
      if (match) {
        setSelectedPrompt(match);
        setActiveVersionIdx(0);
      }
      alert('New prompt version committed successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save version.');
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/ai/prompts/${deleteId}`);
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setSelectedPrompt(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const activeVersion = selectedPrompt?.versions?.[activeVersionIdx];

  // Helper function to extract template variables
  const detectVariables = (text: string) => {
    const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').trim())));
  };

  const variables = detectVariables(editorContent);

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <PageHeader
          title="Prompt Library"
          description="Design, test, and version prompt templates using Monaco Editor with visual parameter tags"
        >
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Prompt
          </button>
        </PageHeader>

        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : !prompts || prompts.length === 0 ? (
          <EmptyState
            title="No prompt templates found"
            description="Add your first system instruction prompt to start versioning, testing, and linking to agent registries."
            icon={BookOpen}
            action={
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg"
              >
                Create Prompt Template
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)] min-h-[500px]">
            {/* Panel 1: Prompts List (3 cols) */}
            <div className="lg:col-span-3 border border-white/[0.06] bg-white/[0.005] rounded-2xl p-4 flex flex-col space-y-3 overflow-y-auto">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Prompt Templates</h3>
              <div className="space-y-1 flex-1">
                {prompts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPrompt(p)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      selectedPrompt?.id === p.id
                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400 font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.01]'
                    }`}
                  >
                    <div className="text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">slug: {p.slug}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel 2: Editor (6 cols) */}
            <div className="lg:col-span-6 border border-white/[0.06] bg-[#07070a] rounded-2xl flex flex-col overflow-hidden">
              {selectedPrompt ? (
                <>
                  <div className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{selectedPrompt.name}</span>
                      <select
                        value={activeVersionIdx}
                        onChange={e => {
                          const idx = parseInt(e.target.value);
                          setActiveVersionIdx(idx);
                          setEditorContent(selectedPrompt.versions?.[idx]?.content || '');
                        }}
                        className="bg-white/[0.02] border border-white/[0.08] text-[10px] text-zinc-400 rounded-md px-2 py-1 outline-none cursor-pointer"
                      >
                        {selectedPrompt.versions?.map((v, index) => (
                          <option key={v.id} value={index} className="bg-[#0c0c14]">
                            Version v{v.version}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveNewVersion}
                        disabled={isSavingVersion}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-all disabled:opacity-50"
                      >
                        {isSavingVersion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save Version
                      </button>
                      <button
                        onClick={() => setDeleteId(selectedPrompt.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete Prompt"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 relative">
                    <MonacoEditor
                      height="100%"
                      defaultLanguage="markdown"
                      theme="vs-dark"
                      value={editorContent}
                      onChange={val => setEditorContent(val || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        scrollbar: { vertical: 'hidden' },
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
                  <BookOpen className="h-8 w-8 text-zinc-700 mb-2" />
                  Select a template prompt from the list to start editing
                </div>
              )}
            </div>

            {/* Panel 3: Sidebar Details & Variables (3 cols) */}
            <div className="lg:col-span-3 border border-white/[0.06] bg-white/[0.005] rounded-2xl p-4 flex flex-col space-y-4 overflow-y-auto">
              {selectedPrompt ? (
                <>
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Scope Details</h4>
                    <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-zinc-500">Visibility:</span> <span className="font-semibold text-zinc-300">{selectedPrompt.visibility}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Versions:</span> <span className="font-mono text-zinc-300">{selectedPrompt.versions?.length || 0}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Variables Identified</h4>
                    <div className="space-y-1.5">
                      {variables.length === 0 ? (
                        <div className="text-[10px] text-zinc-600 italic">No parameters (e.g. &#123;&#123;variable&#125;&#125;) detected.</div>
                      ) : (
                        variables.map(v => (
                          <div key={v} className="px-2.5 py-1.5 rounded-lg border border-indigo-500/10 bg-indigo-500/5 text-indigo-400 font-mono text-[10px] truncate">
                            {v}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-zinc-600 text-[10px] italic">No active configuration selected.</div>
              )}
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-md p-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0f] shadow-2xl relative z-10 space-y-4">
              <h3 className="text-base font-bold text-white">Create Prompt Template</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Prompt Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                    placeholder="e.g. Customer Support System"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Unique Slug (Optional)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                    placeholder="e.g. customer-support-system"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none"
                    placeholder="System prompt context descriptions..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Visibility</label>
                  <select
                    value={visibility}
                    onChange={e => setVisibility(e.target.value)}
                    className="w-full bg-[#0c0c14] border border-white/[0.08] text-xs text-white rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="ORGANIZATION">Organization</option>
                    <option value="PRIVATE">Private</option>
                    <option value="SYSTEM">System (Global)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">System Instruction Content</label>
                  <textarea
                    required
                    value={initialContent}
                    onChange={e => setInitialContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs placeholder-zinc-700 outline-none h-24 resize-none"
                    placeholder="Provide system prompt body text..."
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
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteId !== null}
          title="Delete Prompt Template?"
          description="This will permanently delete this prompt and all version snapshots from this workspace. This action is irreversible."
          loading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </ConsoleLayout>
  );
}
