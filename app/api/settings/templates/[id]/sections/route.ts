import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Verify template belongs to firm
  const { data: template } = await supabaseAdmin
    .from("case_templates")
    .select("id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    section_key?: string;
    display_order?: number;
  };

  if (!body.title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const sectionKey = body.section_key ?? toSnakeCase(body.title);

  const { data: section, error } = await supabaseAdmin
    .from("case_template_sections")
    .insert({
      template_id: params.id,
      title: body.title,
      section_key: sectionKey,
      display_order: body.display_order ?? 1,
    })
    .select("id, title, section_key, display_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ section }, { status: 201 });
}
