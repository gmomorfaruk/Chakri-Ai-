"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  deleteNotification,
  getNotifications,
  getNotificationTypeLabel,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notificationsService";
import { NotificationItem, NotificationType } from "@/types/notifications";

export function NotificationsModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function init() {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      setError(t("profileAuthRequired"));
      return;
    }

    setUserId(auth.user.id);
    await reload(auth.user.id);
    setLoading(false);
  }

  async function reload(uid: string) {
    if (!supabase) return;
    const { data, error: listError } = await getNotifications(supabase, uid);
    if (listError) {
      setError(listError.message);
      return;
    }
    setNotifications(data ?? []);
  }

  async function onMarkRead(id: string) {
    if (!supabase || !userId) return;
    await markNotificationRead(supabase, id);
    await reload(userId);
  }

  async function onMarkAllRead() {
    if (!supabase || !userId) return;
    await markAllNotificationsRead(supabase, userId);
    await reload(userId);
  }

  async function onDelete(id: string) {
    if (!supabase || !userId) return;
    await deleteNotification(supabase, id);
    await reload(userId);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    notifications.forEach((item) => {
      const key = item.type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [notifications]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("notifications")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("notificationsHint")}</p>
          </div>
          <button
            onClick={onMarkAllRead}
            className="group relative px-6 py-2.5 rounded-lg font-semibold text-sm overflow-hidden transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300" />
            <div className="absolute inset-0 border border-primary/30 group-hover:border-primary/50 rounded-lg transition-all duration-300" />
            <span className="relative text-foreground group-hover:text-primary transition-colors duration-300">
              {t("markAllRead")}
            </span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/50 to-card/20 p-8 text-center backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">{t("emptyNotifications")}</p>
        </div>
      ) : (
        grouped.map(([type, items]) => (
          <section key={type} className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-primary ">{getNotificationTypeLabel(type as NotificationType)}</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={`group rounded-lg border p-4 transition-all duration-300 ${
                    item.is_read
                      ? "border-border/20 bg-muted/20"
                      : "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground/80">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.link ? (
                        <Link
                          href={item.link}
                          className="mt-2 inline-block text-xs font-medium text-primary hover:text-accent transition-colors duration-300"
                        >
                          {t("open")} →
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {!item.is_read ? (
                        <button
                          className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/60 transition-all duration-300"
                          onClick={() => void onMarkRead(item.id)}
                        >
                          {t("markRead")}
                        </button>
                      ) : null}
                      <button
                        className="px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-all duration-300"
                        onClick={() => void onDelete(item.id)}
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
