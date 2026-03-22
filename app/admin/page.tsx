"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModule } from "@/components/admin/AdminModule";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";

type ViewState = "checking" | "login" | "denied" | "ready";

export default function AdminPage() {
  const supabase = useSupabase();
  const { t } = useI18n();
  const router = useRouter();

  const [view, setView] = useState<ViewState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    void checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function checkAccess() {
    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      setView("denied");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setView("login");
      return;
    }

    const { data: profile, error: roleError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (roleError) {
      setError(roleError.message);
      setView("denied");
      return;
    }

    if (profile?.role !== "admin") {
      setError(t("adminAccessDenied"));
      setView("denied");
      return;
    }

    setView("ready");
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }
    setAuthLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setAuthLoading(false);
      setError(signInError.message);
      return;
    }
    await checkAccess();
    setAuthLoading(false);
  }

  async function onSignOut() {
    if (supabase) await supabase.auth.signOut();
    setView("login");
    router.refresh();
  }

  if (view === "ready") {
    return <AdminModule />;
  }

  const showError = error && view !== "checking";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Admin Sign In</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in with your admin email and password.</p>

          {showError ? (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {authLoading ? t("loading") : "Sign In"}
            </button>
          </form>

          {view === "denied" ? (
            <div className="mt-4 text-xs text-muted-foreground">
              <button onClick={onSignOut} className="underline">
                {t("signOut")}
              </button>{" "}
              to switch accounts.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
