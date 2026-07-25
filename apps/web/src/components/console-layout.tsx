'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Zap,
  LayoutDashboard,
  Bot,
  BookOpen,
  Cpu,
  BarChart3,
  Terminal,
  Settings,
  LogOut,
  ChevronDown,
  Activity,
  User
} from 'lucide-react';
import api from '../components/api';

interface Org {
  id: string;
  name: string;
  slug: string;
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; email: string } | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');

  // Sidebar navigation mapping
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Agent Registry', path: '/agents', icon: Bot },
    { label: 'Prompt Library', path: '/prompts', icon: BookOpen },
    { label: 'AI Providers', path: '/providers', icon: Cpu },
    { label: 'Usage Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Playground', path: '/playground', icon: Terminal },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  useEffect(() => {
    // 1. Load User profile from cache
    const cachedUser = localStorage.getItem('user_profile');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }

    // 2. Fetch Organizations
    api.get('/organizations')
      .then(res => {
        const organizations = res.data.data;
        setOrgs(organizations);
        const savedOrgId = localStorage.getItem('active_org_id');
        const currentOrg = organizations.find((o: Org) => o.id === savedOrgId) || organizations[0];
        if (currentOrg) {
          setActiveOrg(currentOrg);
          localStorage.setItem('active_org_id', currentOrg.id);
        }
      })
      .catch(() => {});

    // 3. System Health polling
    const pollHealth = () => {
      api.get('/health/ready')
        .then(() => setHealthStatus('healthy'))
        .catch(() => setHealthStatus('down'));
    };
    pollHealth();
    const interval = setInterval(pollHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleOrgChange = (orgId: string) => {
    const selected = orgs.find(o => o.id === orgId);
    if (selected) {
      setActiveOrg(selected);
      localStorage.setItem('active_org_id', selected.id);
      window.location.reload(); // Refresh components state on context swap
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('active_org_id');
    localStorage.removeItem('user_profile');
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#060608]">
      {/* Sidebar navigation */}
      <aside className="w-64 bg-[#0a0a0f] border-r border-white/[0.05] flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* Logo block */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/[0.05]">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              AIOps Hub
            </span>
          </div>

          {/* Org Selector */}
          <div className="p-4 border-b border-white/[0.05]">
            <div className="relative">
              <select
                value={activeOrg?.id || ''}
                onChange={e => handleOrgChange(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] text-xs text-white rounded-lg px-3 py-2.5 outline-none appearance-none cursor-pointer font-medium transition-colors"
              >
                {orgs.map(o => (
                  <option key={o.id} value={o.id} className="bg-[#0c0c14] text-white">
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const active = pathname === item.path;
              return (
                <a
                  key={item.label}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* User context footer */}
        <div className="p-4 border-t border-white/[0.05] bg-black/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'Workspace User'}</div>
              <div className="text-[10px] text-zinc-500 truncate">{user?.email || ''}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-zinc-400 text-xs font-semibold transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-white/[0.05] flex items-center justify-end px-8 flex-shrink-0 bg-[#060608]/50 backdrop-blur-xl z-10">
          {/* Health indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Backend Active
          </div>
        </header>

        {/* Console Workspace */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
