import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      "[register] env check failed — NEXT_PUBLIC_SUPABASE_URL present:",
      !!SUPABASE_URL,
      "| SUPABASE_SERVICE_ROLE_KEY present:",
      !!SERVICE_KEY
    );
    throw new Error("Server misconfiguration: missing Supabase credentials.");
  }
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  let userId: string | null = null;
  let firmId: string | null = null;

  try {
    const admin = getAdminClient();

    const { email, password, full_name, mara_number, firm_name, abn } =
      await request.json();

    if (!email || !password || !full_name || !firm_name) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // 1. Create auth user — email auto-confirmed via admin API
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("[register] step 1 failed — auth.admin.createUser:", authError);
      return NextResponse.json(
        { error: authError?.message ?? "Could not create account." },
        { status: 400 }
      );
    }

    userId = authData.user.id;
    console.error("[register] step 1 done — auth user created:", userId);

    // 2. Create the firm
    const { data: firm, error: firmError } = await admin
      .from("firms")
      .insert({ name: firm_name, abn: abn ?? null })
      .select("id")
      .single();

    if (firmError || !firm) {
      console.error("[register] step 2 failed — firm insert:", firmError);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: firmError?.message ?? "Could not create firm." },
        { status: 500 }
      );
    }

    firmId = firm.id;
    console.error("[register] step 2 done — firm created:", firmId);

    // 3. Wait for the auth trigger to create the profile row, then update it.
    //    The trigger runs asynchronously so the row may not exist immediately.
    const MAX_ATTEMPTS = 5;
    const RETRY_MS = 500;
    let profileExists = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (existing) {
        profileExists = true;
        console.error(
          `[register] step 3 — profile row found on attempt ${attempt}`
        );
        break;
      }

      console.error(
        `[register] step 3 — profile row not yet present, attempt ${attempt}/${MAX_ATTEMPTS}, waiting ${RETRY_MS}ms`
      );
      await sleep(RETRY_MS);
    }

    if (!profileExists) {
      console.error(
        "[register] step 3 failed — profile row never appeared after",
        MAX_ATTEMPTS,
        "attempts; rolling back"
      );
      await admin.auth.admin.deleteUser(userId);
      await admin.from("firms").delete().eq("id", firmId);
      return NextResponse.json(
        {
          error:
            "Account setup timed out waiting for profile row. Please try again.",
        },
        { status: 500 }
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name,
        mara_number: mara_number ?? null,
        firm_id: firmId,
        role: "firm_admin",
      })
      .eq("id", userId);

    if (profileError) {
      console.error("[register] step 3 failed — profile update:", profileError);
      await admin.auth.admin.deleteUser(userId);
      await admin.from("firms").delete().eq("id", firmId);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    console.error("[register] step 3 done — profile updated:", userId);

    // 4. Create the trust account for the new firm
    const { error: trustError } = await admin
      .from("trust_accounts")
      .insert({ firm_id: firmId, balance: 0 });

    if (trustError) {
      console.error(
        "[register] step 4 warning — trust_account insert failed:",
        trustError
      );
    } else {
      console.error(
        "[register] step 4 done — trust_account created for firm:",
        firmId
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register] unexpected error:", err);
    try {
      const admin = getAdminClient();
      if (userId) await admin.auth.admin.deleteUser(userId);
      if (firmId) await admin.from("firms").delete().eq("id", firmId);
    } catch {
      console.error(
        "[register] rollback failed — manual cleanup may be needed for userId:",
        userId,
        "firmId:",
        firmId
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
