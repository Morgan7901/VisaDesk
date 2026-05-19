/**
 * Server-side notification helper.
 * Batch-inserts one notification row per profileId using the admin client
 * (bypasses RLS). Safe to fire-and-forget or await — errors are logged but
 * never thrown so callers are never blocked by a notification failure.
 *
 * Notification types:
 *   document_uploaded  — client uploaded a document via portal
 *   message_received   — client sent a portal message
 *   deadline_due       — deadline is due today
 *   deadline_overdue   — deadline is past due
 *   stage_complete     — workflow stage marked complete
 *   case_granted       — case status changed to granted
 *   case_refused       — case status changed to refused
 *   team_invite        — team member invited
 *   general            — fallback / catch-all
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function notify(
  profileIds: string[],
  firmId: string,
  type: string,
  title: string,
  body?: string,
  url?: string
): Promise<void> {
  if (!profileIds.length) return;

  const rows = profileIds.map((profile_id) => ({
    profile_id,
    firm_id: firmId,
    type,
    title,
    body: body ?? null,
    url: url ?? null,
  }));

  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (error) {
    console.error("[notify] failed to insert notifications:", error.message);
  }
}
