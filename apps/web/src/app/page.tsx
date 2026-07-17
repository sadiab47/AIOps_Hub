import React from 'react';
import { Terminal, Zap, Database, Server, Layout } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-zinc-800/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            AIOps Hub
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="http://localhost:3001/api/v1/health"
            target="_blank"
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 flex items-center gap-1.5 font-medium transition hover:bg-emerald-500/10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Backend Health Check
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 text-xs font-semibold mb-6">
          <Terminal className="h-3.5 w-3.5" />
          Sprint 0 Initialized
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent animate-fade-in">
          AI Automation Platform <br className="hidden md:block" />
          for Premium Consultancy.
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          A production-ready multi-tenant codebase featuring Domain-Driven Design, 
          repository patterns, Prisma DB architectures, and high-performance background queues.
        </p>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 z-10">
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-indigo-500/50 transition duration-300 group">
          <div className="h-12 w-12 rounded-xl bg-zinc-800/80 flex items-center justify-center mb-6 border border-zinc-700/50 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition">
            <Database className="h-6 w-6 text-zinc-400 group-hover:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Prisma & Postgres</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Multi-tenant data models with UUIDs, Auditing, and Soft Deletes built-in by default.
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-indigo-500/50 transition duration-300 group">
          <div className="h-12 w-12 rounded-xl bg-zinc-800/80 flex items-center justify-center mb-6 border border-zinc-700/50 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition">
            <Server className="h-6 w-6 text-zinc-400 group-hover:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">NestJS API Skeleton</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            API versioning, Zod validation, Pino-logger, and strict DDD-lite repository design.
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-indigo-500/50 transition duration-300 group">
          <div className="h-12 w-12 rounded-xl bg-zinc-800/80 flex items-center justify-center mb-6 border border-zinc-700/50 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition">
            <Layout className="h-6 w-6 text-zinc-400 group-hover:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Next.js 15 Web</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Modern frontend skeleton structured with layouts, custom properties, and Tailwind styling.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-8 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between text-zinc-500 text-xs gap-4 z-10">
        <div>
          &copy; {new Date().getFullYear()} AIOps Hub. Built for Flagship Consulting.
        </div>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <span>Sprint 0 Complete</span>
          <span>•</span>
          <span>Docker Ready</span>
          <span>•</span>
          <span>TypeScript strict</span>
        </div>
      </footer>
    </main>
  );
}
