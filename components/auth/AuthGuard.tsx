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
    async function checkSession() {
      if (!supabase) {
        router.replace("/sign-in");
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace("/sign-in");
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Lock broken by another request")) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            router.replace("/sign-in");
            return;
          }
        } else {
          router.replace("/sign-in");
          return;
        }
      }

      setChecking(false);
    }

    void checkSession();
  }, [supabase, router]);

  if (checking) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{t("authChecking")}</div>;
  }

  return <>{children}</>;
}
