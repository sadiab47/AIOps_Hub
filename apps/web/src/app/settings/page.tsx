"use client";

import React from "react";
import { Settings as SettingsIcon, Shield, Trash2, Key } from "lucide-react";
import ConsoleLayout from "../../components/console-layout";

export default function Settings() {
  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Settings
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Configure organizations, profiles, and tokens
          </p>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Organization metadata card */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">
                Organization Profile
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  disabled
                  value="Flagship Consulting"
                  className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-400 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="p-6 rounded-2xl border border-red-500/10 bg-red-500/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-5 w-5 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">
                Danger Zone
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              Deleting this organization will permanently clear all agent
              registries, version history, prompt templates, and execution
              traces. This action is irreversible.
            </p>
            <button className="h-10 px-4 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent text-xs font-semibold transition-all">
              Delete Organization
            </button>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}
