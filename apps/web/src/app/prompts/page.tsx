'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';

export default function Prompts() {
  const { data: prompts, isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const res = await api.get('/ai/prompts');
      return res.data.data;
    },
  });

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Prompt Library</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage and version system prompt templates</p>
          </div>
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20">
            <Plus className="h-4 w-4" />
            New Prompt
          </button>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : !prompts || prompts.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center">
            <BookOpen className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No prompts found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Add a prompt to start versioning system instructions and mapping variable parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt: any) => (
              <div key={prompt.id} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1.5">{prompt.name}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{prompt.description || 'No description provided.'}</p>
                </div>
                <div className="text-[10px] text-zinc-600 border-t border-white/[0.04] pt-3">
                  Scope: {prompt.visibility}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
