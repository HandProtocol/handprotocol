"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

/*
  Login page for the HAND Command Center.
  Email + password against Supabase Auth. PRD section 6 mentions magic-link
  parity, the callback route at /auth/callback handles that flow when we
  enable it via the Supabase dashboard.
*/
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not reach Supabase";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hud-surface relative min-h-screen flex items-center justify-center px-4">
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      <Toaster />

      <div className="relative w-full max-w-sm space-y-6">
        <header className="text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.12)]">
            <span className="font-mono text-base font-semibold text-[var(--amber-soft)]">
              H
            </span>
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight">
              HAND Command Center
            </h1>
            <p className="mt-1 eyebrow">Operator bridge, admin sign-in</p>
          </div>
        </header>

        <div className="panel p-6 space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@handprotocol.org"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
          HAND Protocol, 501(c)(3) in formation, Austin, TX
        </p>
      </div>
    </div>
  );
}
