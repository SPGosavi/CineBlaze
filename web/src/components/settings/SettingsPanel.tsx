"use client";

import { LogIn, LogOut, Sliders, User as UserIcon } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Label from "@/components/ui/Label";
import Well from "@/components/ui/Well";
import Skeleton from "@/components/ui/Skeleton";

export default function SettingsPanel() {
  const { user, loading, logout } = useAuthContext();

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-display font-medium text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your account profile and application preferences.
        </p>
      </div>

      {/* Account Section */}
      <Well className="space-y-4">
        <Label as="h2" size="sm">
          Account profile
        </Label>

        {loading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-rule bg-paper-3 text-xl font-medium text-ink">
                {user.isAnonymous ? <UserIcon size={26} /> : initial}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-base font-medium text-ink">
                  {user.isAnonymous
                    ? "Guest User"
                    : user.displayName || user.email}
                </p>
                <p className="truncate text-sm text-muted">
                  {user.email ?? "Signed in anonymously"}
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full border border-rule bg-paper-3 px-2.5 py-0.5 font-mono text-xs text-muted">
                    {user.isAnonymous ? "Guest Session" : "Email Account"}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => void logout()}
              leftIcon={<LogOut size={16} />}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium text-ink">Not signed in</p>
              <p className="text-sm text-muted">
                Sign in to sync your watchlist across all devices.
              </p>
            </div>
            <Button
              href="/login"
              variant="ember"
              leftIcon={<LogIn size={16} />}
            >
              Sign in
            </Button>
          </div>
        )}
      </Well>

      {/* Preferences Section */}
      <Well className="space-y-4">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-muted" aria-hidden="true" />
          <Label as="h2" size="sm">
            Preferences
          </Label>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink">
            Display &amp; filtering
          </p>
          <p className="text-xs text-muted">
            Content rating, default streaming regions, and theme customization
            are coming soon.
          </p>
          <p className="text-xs text-muted/70 italic">
            Nothing was saved; this is not connected yet.
          </p>
        </div>
      </Well>
    </div>
  );
}
