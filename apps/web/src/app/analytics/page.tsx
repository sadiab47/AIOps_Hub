'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2 } from 'lucide-react';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';

export default function Analytics() {
  const { data: usageLog, isLoading } = useQuery({
    queryKey: ['usage-analytics'],
    queryFn: async () => {
      const res = await api.get('/ai/usage');
      return res.data.data;
    },
  });

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Usage Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">Detailed logs of AI requests, costs, and token usages</p>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : !usageLog || usageLog.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center">
            <BarChart3 className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No usage logs available</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Once agents make executions, analytics, cost calculators, and traces will render here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-semibold text-zinc-400 uppercase bg-white/[0.02]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Model</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Prompt Tokens</th>
                  <th className="p-4">Completion Tokens</th>
                  <th className="p-4">Cost</th>
                </tr>
              </thead>
              <tbody className="text-xs text-zinc-300 divide-y divide-white/[0.04]">
                {usageLog.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.01]">
                    <td className="p-4">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-4 font-mono">{log.model}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4">{log.promptTokens}</td>
                    <td className="p-4">{log.completionTokens}</td>
                    <td className="p-4 font-semibold text-zinc-100">${log.totalCost?.toFixed(4) || '0.0000'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
