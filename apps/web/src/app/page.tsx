'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap, Bot, BookOpen, Cpu, BarChart3, ChevronRight,
  Github, ExternalLink, Check, Circle, ArrowRight,
  Shield, Users, Layers, Activity, Code2, Database,
  Globe, Lock, Sparkles, Terminal, Play, FileText,
  Menu, X, Gauge, MessageSquare
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthStatus {
  status: 'loading' | 'healthy' | 'degraded' | 'down';
  api: boolean;
  db: boolean;
  redis: boolean;
}

// ─── Health Hook ──────────────────────────────────────────────────────────────
function useHealth(): HealthStatus {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'loading', api: false, db: false, redis: false,
  });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/health/ready', { signal: AbortSignal.timeout(4000) });
        const data = await res.json();
        setHealth({
          status: res.ok ? 'healthy' : 'degraded',
          api: true,
          db: data?.data?.checks?.database === 'ok',
          redis: data?.data?.checks?.redis === 'ok',
        });
      } catch {
        setHealth({ status: 'down', api: false, db: false, redis: false });
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return health;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ health }: { health: HealthStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Agents', href: '#agents' },
    { label: 'Prompts', href: '#prompts' },
    { label: 'Providers', href: '#providers' },
    { label: 'Usage', href: '#stats' },
    { label: 'Roadmap', href: '#roadmap' },
  ];

  const statusColor = {
    loading: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/30',
    healthy: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    degraded: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    down: 'text-red-400 border-red-500/20 bg-red-500/5',
  }[health.status];

  const statusDot = {
    loading: 'bg-zinc-500',
    healthy: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    down: 'bg-red-400',
  }[health.status];

  const statusLabel = {
    loading: 'Connecting…',
    healthy: 'All Systems Healthy',
    degraded: 'Degraded',
    down: 'Offline',
  }[health.status];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#060608]/90 backdrop-blur-xl border-b border-white/[0.05]' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text">AIOps Hub</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <a key={l.label} href={l.href}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all duration-150 font-medium">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-medium ${statusColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot} ${health.status === 'healthy' ? 'animate-pulse' : ''}`} />
            {statusLabel}
          </span>
          <a href="https://github.com/sadiab47/AIOps_Hub" target="_blank" rel="noreferrer"
            className="h-8 w-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all">
            <Github className="h-4 w-4" />
          </a>
          <a href="http://localhost:3001/api/docs" target="_blank" rel="noreferrer"
            className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20">
            <Play className="h-3.5 w-3.5" />
            API Docs
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06] px-6 pb-4">
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-sm text-zinc-400 hover:text-white font-medium transition-colors">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/[0.06] flex gap-3 mt-2">
            <a href="http://localhost:3001/api/docs" target="_blank" rel="noreferrer"
              className="flex-1 h-9 rounded-lg bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> API Docs
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Dashboard Preview ────────────────────────────────────────────────────────
function DashboardPreview() {
  const agents = [
    { name: 'Support Agent', model: 'gpt-4o', status: 'ACTIVE', tokens: '12.4k', cost: '$0.18' },
    { name: 'Sales Agent', model: 'claude-3.5', status: 'ACTIVE', tokens: '8.1k', cost: '$0.11' },
    { name: 'Code Review', model: 'gpt-4o-mini', status: 'DRAFT', tokens: '—', cost: '—' },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0a0f] shadow-2xl shadow-black/60">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-amber-500/70" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-xs text-zinc-500 font-medium">AIOps Hub — Agent Registry</span>
      </div>

      {/* Sidebar + content */}
      <div className="flex h-72">
        {/* Mini sidebar */}
        <div className="w-40 border-r border-white/[0.05] p-3 flex flex-col gap-0.5 flex-shrink-0">
          {[
            { icon: Gauge, label: 'Dashboard', active: false },
            { icon: Bot, label: 'Agents', active: true },
            { icon: BookOpen, label: 'Prompts', active: false },
            { icon: Cpu, label: 'Providers', active: false },
            { icon: MessageSquare, label: 'Chat', active: false },
            { icon: BarChart3, label: 'Analytics', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Agent Registry</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              {agents.length} agents
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Total Tokens', value: '20.5k' },
              { label: 'Cost Today', value: '$0.29' },
              { label: 'Active Agents', value: '2' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.05]">
                <div className="text-[10px] text-zinc-500 mb-0.5">{s.label}</div>
                <div className="text-sm font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Agent rows */}
          <div className="space-y-1.5">
            {agents.map(agent => (
              <div key={agent.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-indigo-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-200">{agent.name}</div>
                    <div className="text-[10px] text-zinc-500">{agent.model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 hidden sm:block">{agent.tokens}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${agent.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '206', label: 'Tests Passing', icon: Check },
    { value: '32', label: 'Test Suites', icon: Layers },
    { value: '5+', label: 'LLM Providers', icon: Cpu },
    { value: '100%', label: 'Critical Coverage', icon: Shield },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-20" id="stats">
      {stats.map(({ value, label, icon: Icon }) => (
        <div key={label} className="text-center p-6 rounded-2xl card-glass border border-white/[0.05] hover:border-indigo-500/20 transition-all group">
          <Icon className="h-5 w-5 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
          <div className="text-3xl font-extrabold gradient-text-primary mb-1">{value}</div>
          <div className="text-xs text-zinc-500 font-medium">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Feature Capabilities ─────────────────────────────────────────────────────
function Capabilities() {
  const caps = [
    { icon: Shield, label: 'Multi-Tenant Auth', desc: 'JWT rotation, RBAC, policy engine, per-org isolation.' },
    { icon: Bot, label: 'Agent Registry', desc: 'Immutable version snapshots, prompt bindings, provider configs.' },
    { icon: BookOpen, label: 'Prompt Library', desc: 'Versioned templates with variable engine and Jinja-style rendering.' },
    { icon: Cpu, label: '5 AI Providers', desc: 'OpenAI, Claude, Gemini, Azure, Ollama — unified abstraction layer.' },
    { icon: MessageSquare, label: 'SSE Streaming Chat', desc: 'Real-time token streaming with sliding-window and summary memory.' },
    { icon: BarChart3, label: 'Usage Analytics', desc: 'Token cost, latency, provider and model breakdowns, daily trends.' },
    { icon: Activity, label: 'Health Probes', desc: 'Separate /live and /ready probes for Kubernetes-ready deployments.' },
    { icon: Globe, label: 'Production Hardened', desc: 'Rate limiting, helmet, request IDs, structured logging, Zod validation.' },
  ];

  return (
    <section className="my-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          Platform Capabilities
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold gradient-text mb-3">Everything built-in.</h2>
        <p className="text-zinc-500 text-base max-w-xl mx-auto">
          Enterprise-grade architecture spanning auth, AI orchestration, telemetry, and operational readiness.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {caps.map(({ icon: Icon, label, desc }) => (
          <div key={label}
            className="p-5 rounded-2xl card-glass hover:border-indigo-500/25 hover:bg-indigo-500/[0.03] transition-all duration-300 group cursor-default">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-all">
              <Icon className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="text-sm font-semibold text-white mb-1.5">{label}</div>
            <div className="text-xs text-zinc-500 leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Provider Cards ───────────────────────────────────────────────────────────
function Providers() {
  const providers = [
    { name: 'OpenAI', models: 'GPT-4o, GPT-4o-mini, o1', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    { name: 'Anthropic', models: 'Claude 3.5 Sonnet, Haiku', color: 'from-orange-500/20 to-amber-500/20', border: 'border-orange-500/20', dot: 'bg-orange-400' },
    { name: 'Google', models: 'Gemini 1.5 Pro, Flash', color: 'from-blue-500/20 to-sky-500/20', border: 'border-blue-500/20', dot: 'bg-blue-400' },
    { name: 'Azure OpenAI', models: 'GPT-4, GPT-35-Turbo', color: 'from-indigo-500/20 to-violet-500/20', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
    { name: 'Ollama', models: 'Llama 3, Mistral, Phi', color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-500/20', dot: 'bg-purple-400' },
  ];

  return (
    <section className="my-20" id="providers">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-semibold mb-4">
          <Cpu className="h-3.5 w-3.5" />
          AI Providers
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold gradient-text mb-3">One interface. Every model.</h2>
        <p className="text-zinc-500 text-base max-w-md mx-auto">Switch providers without changing application code.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {providers.map(p => (
          <div key={p.name}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br ${p.color} border ${p.border} backdrop-blur-sm hover:scale-105 transition-transform cursor-default`}>
            <span className={`h-2 w-2 rounded-full ${p.dot} flex-shrink-0`} />
            <div>
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="text-[10px] text-zinc-400">{p.models}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Architecture Diagram ─────────────────────────────────────────────────────
function Architecture() {
  const layers = [
    { label: 'Next.js Frontend', icon: Globe, color: 'text-sky-400 border-sky-500/30 bg-sky-500/5' },
    { label: 'NestJS API Gateway', icon: Code2, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5' },
    { label: 'Auth + RBAC', icon: Lock, color: 'text-violet-400 border-violet-500/30 bg-violet-500/5' },
    { label: 'Agent Engine', icon: Bot, color: 'text-purple-400 border-purple-500/30 bg-purple-500/5' },
    { label: 'Prompt Library', icon: BookOpen, color: 'text-rose-400 border-rose-500/30 bg-rose-500/5' },
    { label: 'Provider Factory', icon: Cpu, color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
    { label: 'Usage Analytics', icon: BarChart3, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
    { label: 'PostgreSQL + Redis', icon: Database, color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/5' },
  ];

  return (
    <section className="my-20">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold mb-4">
          <Layers className="h-3.5 w-3.5" />
          Domain-Driven Architecture
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold gradient-text mb-3">Built for enterprise scale.</h2>
        <p className="text-zinc-500 text-base max-w-md mx-auto">Clean separation between every domain layer.</p>
      </div>

      <div className="flex flex-col items-center gap-0">
        {layers.map((layer, i) => (
          <div key={layer.label} className="flex flex-col items-center">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border text-sm font-medium ${layer.color} w-72 justify-center`}>
              <layer.icon className="h-4 w-4 flex-shrink-0" />
              {layer.label}
            </div>
            {i < layers.length - 1 && (
              <div className="flex flex-col items-center my-1">
                <div className="w-px h-4 bg-gradient-to-b from-white/10 to-transparent" />
                <ChevronRight className="h-3 w-3 text-zinc-600 -rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────
function Roadmap() {
  const phases = [
    {
      version: 'v0.1–0.2',
      label: 'Security & Multi-tenancy',
      status: 'done',
      items: ['JWT + Refresh Tokens', 'RBAC + Policy Engine', 'Multi-Org Architecture', 'Audit Logging'],
    },
    {
      version: 'v0.3',
      label: 'AI Infrastructure',
      status: 'done',
      items: ['Prompt Library', 'SSE Streaming Chat', 'Conversation Memory', 'Usage Analytics'],
    },
    {
      version: 'v0.3.1',
      label: 'Production Hardening',
      status: 'done',
      items: ['Health Probes', 'Rate Limiting', 'Config Validation', 'Request Tracing'],
    },
    {
      version: 'v0.4.0',
      label: 'Agent Platform',
      status: 'current',
      items: ['Agent Registry ✓', 'Tool Framework', 'Agent Runtime', 'Execution History'],
    },
    {
      version: 'v0.5',
      label: 'Knowledge & Scale',
      status: 'upcoming',
      items: ['RAG / Knowledge Base', 'Scheduling & Queues', 'Workflow Engine', 'MCP Integration'],
    },
  ];

  return (
    <section className="my-20" id="roadmap">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold mb-4">
          <Terminal className="h-3.5 w-3.5" />
          Roadmap
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold gradient-text mb-3">From foundation to platform.</h2>
        <p className="text-zinc-500 text-base max-w-md mx-auto">A systematic progression of independently releasable milestones.</p>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/30 via-white/5 to-transparent hidden md:block" />
        <div className="space-y-4">
          {phases.map(phase => (
            <div key={phase.version} className="relative flex gap-6 group">
              {/* Timeline dot */}
              <div className="hidden md:flex flex-col items-center flex-shrink-0 w-16">
                <div className={`h-4 w-4 rounded-full border-2 z-10 flex-shrink-0 mt-4 ${
                  phase.status === 'done' ? 'bg-emerald-500 border-emerald-400' :
                  phase.status === 'current' ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]' :
                  'bg-zinc-700 border-zinc-600'
                }`} />
              </div>

              {/* Card */}
              <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 ${
                phase.status === 'current'
                  ? 'border-indigo-500/30 bg-indigo-500/[0.04] glow-border'
                  : phase.status === 'done'
                  ? 'border-white/[0.05] bg-white/[0.01] hover:border-white/[0.08]'
                  : 'border-white/[0.04] bg-white/[0.01] opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">{phase.version}</span>
                    <span className={`text-sm font-semibold ${
                      phase.status === 'current' ? 'text-indigo-300' :
                      phase.status === 'done' ? 'text-white' : 'text-zinc-500'
                    }`}>{phase.label}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    phase.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    phase.status === 'current' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {phase.status === 'done' ? '✓ Complete' : phase.status === 'current' ? '⚡ In Progress' : 'Upcoming'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {phase.items.map(item => (
                    <span key={item} className="text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Live Health Panel ────────────────────────────────────────────────────────
function HealthPanel({ health }: { health: HealthStatus }) {
  const checks = [
    { label: 'API Server', ok: health.api },
    { label: 'PostgreSQL', ok: health.db },
    { label: 'Redis', ok: health.redis },
  ];

  return (
    <section className="my-20">
      <div className="max-w-lg mx-auto p-6 rounded-2xl card-glass border border-white/[0.07] text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`h-2 w-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : health.status === 'loading' ? 'bg-zinc-500 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-sm font-semibold text-white">
            {health.status === 'healthy' ? 'All Systems Operational' :
             health.status === 'loading' ? 'Checking status…' :
             health.status === 'degraded' ? 'Partial Degradation' : 'System Offline'}
          </span>
        </div>
        <div className="flex justify-center gap-4">
          {checks.map(({ label, ok }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800'}`}>
                {ok ? <Check className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-zinc-600" />}
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/[0.05] mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          {
            title: 'Platform',
            links: [
              { label: 'Agents', href: '#agents' },
              { label: 'Prompts', href: '#prompts' },
              { label: 'Providers', href: '#providers' },
              { label: 'Analytics', href: '#stats' },
            ],
          },
          {
            title: 'Developers',
            links: [
              { label: 'API Docs', href: 'http://localhost:3001/api/docs' },
              { label: 'Health API', href: 'http://localhost:3001/api/v1/health' },
              { label: 'GitHub', href: 'https://github.com/sadiab47/AIOps_Hub' },
              { label: 'Roadmap', href: '#roadmap' },
            ],
          },
          {
            title: 'Architecture',
            links: [
              { label: 'ADR Index', href: '#' },
              { label: 'Domain Model', href: '#' },
              { label: 'Security Model', href: '#' },
              { label: 'Changelog', href: '#' },
            ],
          },
          {
            title: 'Project',
            links: [
              { label: 'v0.4.0 — AGENT-001 ✓', href: '#' },
              { label: 'TypeScript Strict', href: '#' },
              { label: 'MIT License', href: '#' },
              { label: '206 Tests Passing', href: '#' },
            ],
          },
        ].map(col => (
          <div key={col.title}>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{col.title}</div>
            <div className="space-y-2">
              {col.links.map(link => (
                <a key={link.label} href={link.href}
                  className="block text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 py-5 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center">
            <Zap className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm text-zinc-500">© {new Date().getFullYear()} AIOps Hub</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          <span>Built with NestJS + Next.js 15</span>
          <span>·</span>
          <span>PostgreSQL + Redis</span>
          <span>·</span>
          <span>develop/v0.4.0</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const health = useHealth();

  return (
    <div className="min-h-screen bg-[#060608] text-[#f4f4f5] selection:bg-indigo-500/40 selection:text-white">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/4 w-[700px] h-[700px] rounded-full bg-indigo-600/6 blur-[160px] pointer-events-none -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/6 blur-[140px] pointer-events-none translate-y-1/2" />

      <Navbar health={health} />

      <main className="max-w-6xl mx-auto px-6 pt-32">

        {/* Hero */}
        <section className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/8 text-indigo-300 text-xs font-semibold mb-6">
            <Zap className="h-3.5 w-3.5" />
            v0.4.0 — Agent Platform · AGENT-001 Complete
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            <span className="gradient-text">Enterprise AI Platform</span>
            <br />
            <span className="text-zinc-500 text-4xl md:text-5xl font-bold">built for production.</span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Multi-tenant Agent orchestration, versioned Prompt Library, real-time streaming chat,
            and full Usage Analytics — all in a single production-ready codebase.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="http://localhost:3001/api/docs" target="_blank" rel="noreferrer"
              className="group flex items-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02]">
              <Play className="h-4 w-4" />
              Explore API Docs
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a href="https://github.com/sadiab47/AIOps_Hub" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 h-12 px-6 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] text-white font-semibold transition-all duration-200 hover:border-white/20">
              <Github className="h-4 w-4" />
              View on GitHub
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
            </a>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-4 animate-fade-up-delay-1">
            {[
              '✓ Multi-Tenant',
              '✓ Agent Registry',
              '✓ Prompt Library',
              '✓ Streaming Chat',
              '✓ Usage Analytics',
              '✓ RBAC + Policy Engine',
            ].map(f => (
              <span key={f} className="text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </section>

        {/* Dashboard Preview */}
        <div className="animate-fade-up-delay-2 mb-4" id="agents">
          <DashboardPreview />
        </div>
        <p className="text-center text-xs text-zinc-600 mb-6">Agent Registry — built in AGENT-001</p>

        {/* Stats */}
        <StatsBar />

        {/* Capabilities */}
        <Capabilities />

        {/* Providers */}
        <Providers />

        {/* Architecture */}
        <Architecture />

        {/* Roadmap */}
        <Roadmap />

        {/* Health */}
        <HealthPanel health={health} />

      </main>

      <Footer />
    </div>
  );
}
