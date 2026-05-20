"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

// ── Colour mapping by notification type ──────────────────────────────────────

const TYPE_DOT: Record<string, string> = {
  document_uploaded: "bg-blue-500",
  message_received:  "bg-green-500",
  deadline_due:      "bg-red-500",
  deadline_overdue:  "bg-red-600",
  stage_complete:    "bg-purple-500",
  case_granted:      "bg-green-500",
  case_refused:      "bg-red-500",
  team_invite:       "bg-amber-500",
  general:           "bg-slate-400",
};

function dotColor(type: string) {
  return TYPE_DOT[type] ?? TYPE_DOT.general;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const profile = useAuthStore((s) => s.profile);
  const setUnreadCount = useAuthStore((s) => s.setUnreadCount);
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const badge = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  // Keep the global store in sync so other components can read the count
  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  // ── Fetch on mount ──────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();

    // Step 1 — confirm a session exists before querying. getSession() reads
    // from cookies/localStorage without a network round-trip, so the JWT is
    // guaranteed to be attached to any subsequent request. Without this gate,
    // the query can fire before the singleton client has loaded the session,
    // which means no Authorization header → Supabase returns 403.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("[NotificationBell] no session — skipping fetch");
      return;
    }

    const userId = session.user.id;
    console.log("[NotificationBell] fetching for user.id:", userId);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);

    console.log("[NotificationBell] fetch result — data:", data, "error:", error);

    if (data) setNotifications(data as Notification[]);
  }, []);

  // fetchNotifications is stable (empty dep array) so this fires exactly once on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: prepend new notifications as they arrive ─────────────────────

  useEffect(() => {
    if (!profile?.id) return;
    console.log("[NotificationBell] subscribing to realtime for profile_id:", profile.id);
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          setNotifications((prev) => [payload.new as unknown as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // ── Click outside to close ─────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // ── Mark single notification read + navigate ───────────────────────────────

  async function handleClick(n: Notification) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      // Optimistic update
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x))
      );
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", n.id);
    }
    if (n.url) {
      setOpen(false);
      router.push(n.url);
    }
  }

  // ── Mark all read ──────────────────────────────────────────────────────────

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: now } : n))
    );
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        <Bell className="h-4 w-4" />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[1rem] min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold leading-none text-white">
            {badge}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Sticky header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-slate-500 transition-colors hover:text-slate-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                No notifications
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50",
                      isUnread && "bg-blue-50/60 hover:bg-blue-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type dot */}
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          dotColor(n.type)
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            isUnread
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-600"
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatDistanceToNow(parseISO(n.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
