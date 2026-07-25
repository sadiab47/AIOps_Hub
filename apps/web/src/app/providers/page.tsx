'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Plus, Loader2 } from 'lucide-react';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';

export default function Providers() {
  const { data: configs, isLoading } = useQuery({
    queryKey: ['provider-configs'],
    queryFn: async () => {
      const res = await api.get('/ai/providers');
      return res.data.data;
    },
  });

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">AI Providers</h1>
            <p className="text-zinc-500 text-sm mt-1">Configure workspace API provider integrations</p>
          </div>
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20">
            <Plus className="h-4 w-4" />
            Add Provider
          </button>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : !configs || configs.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center">
            <Cpu className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No providers configured</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Add keys for OpenAI, Anthropic, Gemini, or Ollama to enable models in your agents.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config: any) => (
              <div key={config.id} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-zinc-500">{config.provider}</span>
                    {config.isDefault && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        Default
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{config.name}</h3>
                </div>
                <div className="text-[10px] text-zinc-600 border-t border-white/[0.04] pt-3">
                  Default Model: {config.defaultModel || 'Not Configured'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
