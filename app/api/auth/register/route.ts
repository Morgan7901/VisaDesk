import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  let userId: string | null = null;

  try {
    const { email, password, full_name, mara_number, firm_name, abn } =
      await request.json();

    if (!email || !password || !full_name || !firm_name) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // 1. Create the auth user (email auto-confirmed via admin API)
    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !authData.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Could not create account." },
        { status: 400 }
      );
    }

    userId = authData.user.id;

    // 2. Create the firm
    const { data: firm, error: firmError } = await supabaseAdmin
      .from("firms")
      .insert({ name: firm_name, abn: abn ?? null })
      .select("id")
      .single();

    if (firmError || !firm) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: firmError?.message ?? "Could not create firm." },
        { status: 500 }
      );
    }

    // 3. Update the profile row created by the trigger in migration 006
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        mara_number: mara_number ?? null,
        firm_id: firm.id,
        role: "firm_admin",
      })
      .eq("id", userId);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
