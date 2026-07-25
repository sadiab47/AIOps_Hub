'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2, Sparkles, DollarSign, Activity, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../components/api';
import ConsoleLayout from '../../components/console-layout';
import { PageHeader } from '../../components/ui/page-header';
import { StatCard } from '../../components/ui/stat-card';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton';
import { EmptyState } from '../../components/ui/empty-state';

export default function Analytics() {
  const { data: usageLog, isLoading: logsLoading } = useQuery({
    queryKey: ['usage-analytics'],
    queryFn: async () => {
      const res = await api.get('/ai/usage');
      return res.data.data;
    },
  });

  const { data: usageSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['usage-summary'],
    queryFn: async () => {
      const res = await api.get('/ai/usage/summary');
      return res.data.data;
    },
  });

  const isLoading = logsLoading || summaryLoading;

  // Chart data mapping
  const areaChartData = usageLog?.map((log: any) => ({
    name: new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    tokens: log.promptTokens + log.completionTokens,
    cost: log.totalCost,
  })).reverse() || [];

  // Provider breakdown mapping
  const providerDataMap: Record<string, number> = {};
  usageLog?.forEach((log: any) => {
    const provider = log.provider || 'UNKNOWN';
    providerDataMap[provider] = (providerDataMap[provider] || 0) + 1;
  });
  const providerChartData = Object.entries(providerDataMap).map(([name, value]) => ({ name, value }));

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e'];

  const stats = [
    { label: 'Today\'s Cost', value: usageSummary?.totalCost ? `$${usageSummary.totalCost.toFixed(4)}` : '$0.0000', icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Total Tokens', value: usageSummary ? (usageSummary.totalPromptTokens + usageSummary.totalCompletionTokens) : '0', icon: Sparkles, color: 'text-indigo-400' },
    { label: 'Avg Latency', value: usageLog && usageLog.length > 0 ? `${Math.round(usageLog.reduce((acc: number, l: any) => acc + l.latencyMs, 0) / usageLog.length)}ms` : '0ms', icon: Activity, color: 'text-violet-400' },
    { label: 'Total Requests', value: usageSummary?.totalRequests || '0', icon: BarChart3, color: 'text-purple-400' },
  ];

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <PageHeader
          title="Usage Analytics"
          description="Visual metrics for token consumption, API latency parameters, and providers cost summaries"
        />

        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : !usageLog || usageLog.length === 0 ? (
          <EmptyState
            title="No telemetry logged yet"
            description="Run agent executions inside the workspace to display latency, cost calculations, and provider breakdowns."
            icon={BarChart3}
          />
        ) : (
          <div className="space-y-6">
            {/* KPI metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map(({ label, value, icon, color }) => (
                <StatCard key={label} label={label} value={value} icon={icon} color={color} />
              ))}
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Token Consumption Area Chart (8 cols) */}
              <div className="lg:col-span-8 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.005] flex flex-col justify-between h-[360px]">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Token Consumption Trend</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaChartData}>
                      <defs>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0c0c14', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11 }} />
                      <Area type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Provider Distribution Pie Chart (4 cols) */}
              <div className="lg:col-span-4 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.005] flex flex-col justify-between h-[360px]">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Provider Share</h3>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={providerChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {providerChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0c0c14', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {providerChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
