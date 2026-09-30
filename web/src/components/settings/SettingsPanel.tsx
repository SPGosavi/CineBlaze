"use client";

import { LogOut, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";

export default function SettingsPanel() {
  const { user, logout } = useAuthContext();

  return (
    <div className="animate-fade-in py-20 text-center text-gray-500">
      <SettingsIcon size={48} className="mx-auto mb-4 opacity-50" />
      <h1 className="text-xl font-bold text-gray-300">Settings</h1>
      <p className="mt-1 text-sm">Preferences coming soon.</p>

      {user ? (
        <button
          type="button"
          onClick={() => void logout()}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-500/40 hover:text-red-300"
        >
          <LogOut size={16} /> Sign out
        </button>
      ) : (
        <Link
          href="/login"
          className="mx-auto mt-6 inline-block rounded-xl border border-neutral-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-red-500/40 hover:text-white"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
