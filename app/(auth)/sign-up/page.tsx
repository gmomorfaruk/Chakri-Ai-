"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const supabase = useSupabase();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/sign-in`,
      },
    });
    setLoading(false);

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("email signups are disabled")) {
        setError(t("authEmailSignupsDisabled"));
      } else {
        setError(signUpError.message);
      }
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      return;
    }

    setSuccess(t("authSignUpCheckEmail"));
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none animate-float" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-blue-500 to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-primary via-blue-500 to-accent bg-clip-text text-transparent">Chakri AI</span>
          </h1>
          <p className="text-muted-foreground text-base font-medium">Start Your AI-Powered Career Journey</p>
        </div>

        {/* Form Card */}
        <div className="group fade-in-scale">
          <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-card to-card/50 p-10 shadow-2xl backdrop-blur-2xl">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t("signUp")}</h2>
            <p className="text-muted-foreground text-sm mb-8">Create your account and start growing with AI</p>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Email input */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300 hover:border-primary/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password input */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300 hover:border-primary/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-2.5 text-xs text-muted-foreground font-medium">Minimum 6 characters</p>
              </div>

              {/* Error message */}
              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium animate-slideInUp">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                </div>
              ) : null}

              {/* Success message */}
              {success ? (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400 font-medium animate-slideInUp">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {success}
                  </div>
                </div>
              ) : null}

              {/* Submit button */}
              <button
                disabled={loading}
                className="group relative w-full px-6 py-4 rounded-xl font-bold text-base overflow-hidden transition-all duration-300 disabled:opacity-60 mt-8 text-white"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative text-primary-foreground block">
                  {loading ? t("loading") : t("signUp")}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative mt-9 mb-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gradient-to-br from-card to-card/50 text-muted-foreground font-medium">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Sign in link */}
            <a
              href="/sign-in"
              className="block w-full text-center px-6 py-4 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 font-semibold text-base text-primary hover:text-accent transition-all duration-300 hover:border-primary/60"
            >
              Sign In Instead
            </a>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  );
}
