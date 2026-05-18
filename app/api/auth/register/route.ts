import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialised once per cold-start; throws at boot if keys are missing so
// Vercel logs surface the misconfiguration immediately rather than at call time.
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

export async function POST(request: Request) {
  let userId: string | null = null;

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
      console.error("[register] auth.admin.createUser failed:", authError);
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

    console.error("[register] step 2 done — firm created:", firm.id);

    // 3. Update the profile row created by the trigger in migration 006
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name,
        mara_number: mara_number ?? null,
        firm_id: firm.id,
        role: "firm_admin",
      })
      .eq("id", userId);

    if (profileError) {
      console.error("[register] step 3 failed — profile update:", profileError);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    console.error("[register] step 3 done — profile updated:", userId);

    // 4. Create the trust account for the new firm
    const { error: trustError } = await admin
      .from("trust_accounts")
      .insert({ firm_id: firm.id, balance: 0 });

    if (trustError) {
      // Non-fatal — firm and profile are set up; log but do not roll back
      console.error(
        "[register] step 4 warning — trust_account insert failed:",
        trustError
      );
    } else {
      console.error(
        "[register] step 4 done — trust_account created for firm:",
        firm.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register] unexpected error:", err);
    if (userId) {
      try {
        const admin = getAdminClient();
        await admin.auth.admin.deleteUser(userId);
      } catch {
        console.error("[register] rollback failed — could not delete auth user:", userId);
      }
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
