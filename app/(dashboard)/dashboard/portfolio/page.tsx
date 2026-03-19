"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";

export default function PortfolioDashboardPage() {
  const supabase = useSupabase();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username,is_public")
        .eq("id", authData.user.id)
        .maybeSingle();

      setUsername(data?.username ?? null);
      setIsPublic(Boolean(data?.is_public));
      setLoading(false);
    }

    void load();
  }, [supabase]);

  const publicUrl = useMemo(() => {
    if (!username) return null;
    return `${typeof window !== "undefined" ? window.location.origin : ""}/u/${username}`;
  }, [username]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("portfolio")}</h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("portfolioPublicStatus")}: {isPublic ? t("publicEnabled") : t("publicDisabled")}</p>
        {publicUrl ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t("portfolioShareUrl")}</p>
            <a className="text-primary underline break-all" href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
            </a>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t("portfolioSetUsernameHint")}</p>
        )}
      </div>
    </section>
  );
}
