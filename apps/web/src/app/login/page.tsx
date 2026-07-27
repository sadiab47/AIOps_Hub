"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import api from "../../components/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const profile = res.data.data.user;

      // Save profile metadata
      localStorage.setItem("user_profile", JSON.stringify(profile));

      // Fetch user organizations context
      const orgsRes = await api.get("/organizations");
      const orgs = orgsRes.data.data;
      if (orgs && orgs.length > 0) {
        localStorage.setItem("active_org_id", orgs[0].id);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060608] px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl border border-white/[0.06] bg-[#0a0a0f]/60 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Welcome back
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Sign in to manage your AI workspace
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/55 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-zinc-500 text-xs text-center mt-6">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-indigo-400 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
