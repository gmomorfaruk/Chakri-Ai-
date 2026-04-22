"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const supabase = useSupabase();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const getSessionWithRetry = async () => {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await supabase!.auth.getSession();
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const isLockError = message.includes("Lock broken by another request");
          const canRetry = isLockError && attempt < maxAttempts;

          if (!canRetry) {
            throw error;
          }

          await delay(150 * attempt);
        }
      }

      return { data: { session: null } };
    };

    const redirectToSignIn = () => {
      router.replace("/sign-in");
    };

    async function checkSession() {
      if (!supabase) {
        if (!cancelled) {
          redirectToSignIn();
          setChecking(false);
        }
        return;
      }

      try {
        const { data } = await getSessionWithRetry();
        if (!data.session) {
          if (!cancelled) {
            redirectToSignIn();
          }
          return;
        }

        if (!cancelled) {
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          redirectToSignIn();
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  if (checking) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{t("authChecking")}</div>;
  }

  return <>{children}</>;
}
