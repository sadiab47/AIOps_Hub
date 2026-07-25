'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Plus, Loader2 } from 'lucide-react';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';

export default function Agents() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get('/ai/agents');
      return res.data.data;
    },
  });

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Agent Registry</h1>
            <p className="text-zinc-500 text-sm mt-1">Configure and manage AI Agent configurations</p>
          </div>
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20">
            <Plus className="h-4 w-4" />
            Create Agent
          </button>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center">
            <Bot className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No agents registered</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Create your first agent thread to wire models, system instructions, and schemas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <div key={agent.id} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-zinc-500">v{agent.currentVersion}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-600/10 text-indigo-400 border border-indigo-500/10">
                      {agent.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{agent.name}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{agent.description || 'No description provided.'}</p>
                </div>
                <div className="text-[10px] text-zinc-600 border-t border-white/[0.04] pt-3">
                  Slug: {agent.slug}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
