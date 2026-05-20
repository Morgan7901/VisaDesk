/**
 * clear-db.ts
 * Deletes all rows from every table in the correct FK-safe order.
 * Run with: npx ts-node scripts/clear-db.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Sentinel UUID — neq ensures every real row is deleted
const SENTINEL = "00000000-0000-0000-0000-000000000000";

const TABLES = [
  "case_task_progress",
  "case_stage_progress",
  "automation_log",
  "case_documents",
  "case_field_values",
  "ai_documents",
  "ai_usage",
  "communications",
  "deadlines",
  "trust_transactions",
  "portal_invitations",
  "notifications",
  "cases",
  "clients",
  "sponsors",
  "workflow_tasks",
  "workflow_stages",
  "workflow_templates",
  "case_template_fields",
  "case_template_sections",
  "case_templates",
] as const;

async function clearTable(table: string): Promise<void> {
  const { error, count } = await supabaseAdmin
    .from(table)
    .delete({ count: "exact" })
    .neq("id", SENTINEL);

  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
  } else {
    console.log(`  ✓ ${table}: ${count ?? 0} rows deleted`);
  }
}

async function main() {
  console.log("Clearing VisaDesk database…\n");

  for (const table of TABLES) {
    await clearTable(table);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
