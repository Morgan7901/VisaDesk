import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { NextResponse } from "next/server";

async function validateClientToken(token: string) {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, firm_id, portal_active")
    .eq("portal_token", token)
    .eq("portal_active", true)
    .single();
  return client ?? null;
}

async function resolveCaseId(clientId: string, firmId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("client_id", clientId)
    .eq("firm_id", firmId)
    .in("status", ["active", "submitted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data.id;

  const { data: fallback } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("client_id", clientId)
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return fallback?.id ?? null;
}

// GET — fetch portal messages for this case
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const client = await validateClientToken(token);
  if (!client) return NextResponse.json({ error: "Invalid portal link." }, { status: 401 });

  const caseId = await resolveCaseId(client.id, client.firm_id);
  if (!caseId) return NextResponse.json({ messages: [] });

  const { data: comms } = await supabaseAdmin
    .from("communications")
    .select("id, direction, body, created_at, author:profiles!author_id(full_name)")
    .eq("case_id", caseId)
    .eq("comm_type", "portal_message")
    .neq("direction", "internal")
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (comms ?? []).map((c: any) => {
    const author = Array.isArray(c.author) ? c.author[0] : c.author;
    return {
      id: c.id,
      direction: c.direction,
      body: c.body ?? "",
      author_name: author?.full_name ?? null,
      created_at: c.created_at,
    };
  });

  return NextResponse.json({ messages });
}

// POST — send a message from the portal user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const client = await validateClientToken(token);
  if (!client) return NextResponse.json({ error: "Invalid portal link." }, { status: 401 });

  const caseId = await resolveCaseId(client.id, client.firm_id);
  if (!caseId) return NextResponse.json({ error: "No active case found." }, { status: 400 });

  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  const { data: comm, error } = await supabaseAdmin
    .from("communications")
    .insert({
      case_id: caseId,
      firm_id: client.firm_id,
      author_id: null, // Portal user has no profile
      comm_type: "portal_message",
      direction: "received",
      subject: null,
      body: body.trim(),
      is_omara_logged: false,
    })
    .select("id, direction, body, created_at")
    .single();

  if (error || !comm) {
    console.error("[portal/client/messages POST]", error);
    return NextResponse.json({ error: error?.message ?? "Failed to send." }, { status: 500 });
  }

  // Notify all active agents in the firm
  const [{ data: clientRow }, { data: firmProfiles }] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("full_name")
      .eq("id", client.id)
      .single(),
    supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("firm_id", client.firm_id)
      .eq("suspended", false),
  ]);
  const profileIds = (firmProfiles ?? []).map((p) => p.id);
  await notify(
    profileIds,
    client.firm_id,
    "message_received",
    `New message from ${clientRow?.full_name ?? "client"}`,
    body.trim().slice(0, 100),
    `/dashboard/cases/${caseId}/comms`
  );

  return NextResponse.json({
    message: {
      id: comm.id,
      direction: comm.direction,
      body: comm.body,
      author_name: null,
      created_at: comm.created_at,
    },
  });
}
