import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Fetch the communication — verify firm ownership and get meta
  const { data: comm } = await supabaseAdmin
    .from("communications")
    .select("id, comm_type, author_id, firm_id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!comm) {
    return NextResponse.json({ error: "Communication not found." }, { status: 404 });
  }

  // Only allow deletion of notes authored by the current user
  if (comm.comm_type !== "note") {
    return NextResponse.json(
      { error: "Only internal notes can be deleted." },
      { status: 403 }
    );
  }

  if (comm.author_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete your own notes." },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin
    .from("communications")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
