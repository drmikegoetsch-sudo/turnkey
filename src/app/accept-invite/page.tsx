"use client";

// Where an invited subcontractor lands from their email. Supabase puts the
// session in the URL (fragment or code), the browser client picks it up, and
// the sub chooses a password. No password is ever emailed.

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";

type State = "checking" | "ready" | "invalid";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Supabase invite links land here with the session in the URL *fragment*
    // (#access_token=…). The SSR client speaks PKCE (?code=…) and ignores the
    // fragment, so establish the session explicitly. Both shapes are handled
    // because which one arrives depends on the email template.
    async function establish() {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session?.user) {
        setEmail(existing.session.user.email ?? "");
        setState("ready");
        return;
      }

      const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );
      if (hash.get("error")) {
        setState("invalid");
        return;
      }

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (!error && data.session?.user) {
          setEmail(data.session.user.email ?? "");
          setState("ready");
          // Strip the tokens out of the address bar.
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
        setState("invalid");
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session?.user) {
          setEmail(data.session.user.email ?? "");
          setState("ready");
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
      }

      setState("invalid");
    }

    void establish();
  }, []);

  async function save() {
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    router.push("/my-jobs");
  }

  return (
    <div className="app-ambient flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Turnkey Solutions Network"
            width={260}
            height={87}
            priority
            className="h-auto w-56"
          />
        </div>

        <div className="glass rounded-2xl p-7">
          {state === "checking" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking your invite…
            </p>
          ) : state === "invalid" ? (
            <>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                This link has expired
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Invite links can only be used once. Ask Turnkey to send you a
                fresh invite.
              </p>
            </>
          ) : (
            <>
              <KeyRound className="size-8 text-primary" />
              <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight">
                Choose a password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;re signing in as {email}. Pick a password and
                you&apos;re in.
              </p>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-white/70 backdrop-blur-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void save();
                    }}
                    className="h-11 bg-white/70 backdrop-blur-sm"
                  />
                </div>

                {error ? (
                  <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </p>
                ) : null}

                <Button
                  size="lg"
                  disabled={saving}
                  onClick={save}
                  className="glass-cta mt-1 w-full rounded-full font-semibold shadow-none hover:bg-transparent"
                >
                  {saving ? "Saving…" : "Set password & continue"}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Turnkey Solutions Network
        </p>
      </div>
    </div>
  );
}
