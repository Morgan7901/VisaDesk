/**
 * wipe-sc500.ts
 * Wipes all SC-500 cases and their related data, then re-seeds
 * the SC-500 workflow template with a new 10-stage structure.
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true,"skipLibCheck":true}' scripts/wipe-sc500.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { randomUUID } from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function uuid() { return randomUUID(); }

async function ok<T>(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: PromiseLike<{ data: T; error: any }>
): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
  console.log(`  ✓ ${label}`);
  return data as T;
}

// ────────────────────────────────────────────────────────────
// STEP 1: Find all SC-500 case IDs
// ────────────────────────────────────────────────────────────
async function findSC500CaseIds(): Promise<string[]> {
  const { data, error } = await sb
    .from("cases")
    .select("id")
    .eq("visa_subclass", "500");

  if (error) throw new Error(`findSC500CaseIds: ${JSON.stringify(error)}`);
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  console.log(`  Found ${ids.length} SC-500 case(s)`);
  return ids;
}

// ────────────────────────────────────────────────────────────
// STEP 2: Delete all case-related data
// ────────────────────────────────────────────────────────────
async function wipeCaseData(caseIds: string[]) {
  if (caseIds.length === 0) {
    console.log("  No cases to wipe.");
    return;
  }

  // Delete document_files (child of case_documents)
  const { data: docIds } = await sb
    .from("case_documents")
    .select("id")
    .in("case_id", caseIds);
  const documentIds = (docIds ?? []).map((r: { id: string }) => r.id);

  if (documentIds.length > 0) {
    await ok("document_files", sb.from("document_files").delete().in("case_document_id", documentIds));
  } else {
    console.log("  ✓ document_files: none");
  }

  // Delete case_documents
  await ok("case_documents", sb.from("case_documents").delete().in("case_id", caseIds));

  // Delete case_stage_progress
  await ok("case_stage_progress", sb.from("case_stage_progress").delete().in("case_id", caseIds));

  // Delete case_task_progress
  await ok("case_task_progress", sb.from("case_task_progress").delete().in("case_id", caseIds));

  // Delete case_field_values
  await ok("case_field_values", sb.from("case_field_values").delete().in("case_id", caseIds));

  // Delete communications
  await ok("communications", sb.from("communications").delete().in("case_id", caseIds));

  // Delete deadlines
  await ok("deadlines", sb.from("deadlines").delete().in("case_id", caseIds));

  // Delete trust_transactions
  await ok("trust_transactions", sb.from("trust_transactions").delete().in("case_id", caseIds));

  // Delete ai_documents
  await ok("ai_documents", sb.from("ai_documents").delete().in("case_id", caseIds));

  // Delete notifications / automation_log / ai_usage — skip gracefully if column doesn't exist
  for (const [tbl, col] of [["notifications", "case_id"], ["automation_log", "case_id"], ["ai_usage", "case_id"]] as [string, string][]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (sb.from(tbl) as any).delete().in(col, caseIds);
    if (e && e.code !== "42P01" && e.code !== "42703") {
      // 42P01 = table not found, 42703 = column not found — both safe to skip
      throw new Error(`${tbl}: ${JSON.stringify(e)}`);
    }
    console.log(`  ✓ ${tbl}`);
  }

  // Delete the cases themselves
  await ok("cases", sb.from("cases").delete().in("id", caseIds));
}

// ────────────────────────────────────────────────────────────
// STEP 3: Wipe old SC-500 workflow templates
// ────────────────────────────────────────────────────────────
async function wipeOldWorkflow() {
  // Find old SC-500 templates
  const { data: templates } = await sb
    .from("workflow_templates")
    .select("id")
    .eq("visa_subclass", "500");

  const templateIds = (templates ?? []).map((r: { id: string }) => r.id);
  if (templateIds.length === 0) {
    console.log("  No old SC-500 workflow templates found.");
    return;
  }

  // Find stages
  const { data: stages } = await sb
    .from("workflow_stages")
    .select("id")
    .in("template_id", templateIds);

  const stageIds = (stages ?? []).map((r: { id: string }) => r.id);

  // Delete tasks first
  if (stageIds.length > 0) {
    await ok("workflow_tasks (old)", sb.from("workflow_tasks").delete().in("stage_id", stageIds));
  }

  // Delete stages
  if (templateIds.length > 0) {
    await ok("workflow_stages (old)", sb.from("workflow_stages").delete().in("template_id", templateIds));
  }

  // Delete templates
  await ok("workflow_templates (old)", sb.from("workflow_templates").delete().in("id", templateIds));
}

// ────────────────────────────────────────────────────────────
// STEP 4: Seed new 10-stage SC-500 workflow
// ────────────────────────────────────────────────────────────
async function seedNewWorkflow() {
  console.log("\n── Seeding new SC-500 workflow ──");

  const T500 = uuid();

  await ok("workflow_template: SC-500", sb.from("workflow_templates").insert({
    id: T500,
    firm_id: null,
    visa_subclass: "500",
    label: "Student Visa (Subclass 500)",
    description: "10-stage workflow for student visa applications including Genuine Student assessment, CoE management, and post-lodgement tracking.",
  }));

  // Stage IDs
  const S1 = uuid(), S2 = uuid(), S3 = uuid(), S4 = uuid(), S5 = uuid();
  const S6 = uuid(), S7 = uuid(), S8 = uuid(), S9 = uuid(), S10 = uuid();

  await ok("workflow_stages", sb.from("workflow_stages").insert([
    { id: S1,  template_id: T500, label: "Initial Consultation",        stage_order: 1  },
    { id: S2,  template_id: T500, label: "Course and Provider",         stage_order: 2  },
    { id: S3,  template_id: T500, label: "CoE and OSHC",               stage_order: 3  },
    { id: S4,  template_id: T500, label: "Document Collection",         stage_order: 4  },
    { id: S5,  template_id: T500, label: "Financial Verification",      stage_order: 5  },
    { id: S6,  template_id: T500, label: "GS Assessment and Drafting",  stage_order: 6  },
    { id: S7,  template_id: T500, label: "Application Preparation",     stage_order: 7  },
    { id: S8,  template_id: T500, label: "Lodgement",                  stage_order: 8  },
    { id: S9,  template_id: T500, label: "Post-Lodgement",             stage_order: 9  },
    { id: S10, template_id: T500, label: "Outcome",                    stage_order: 10 },
  ]));

  // All tasks
  const tasks = [
    // Stage 1: Initial Consultation
    { id: uuid(), stage_id: S1, label: "Collect client's personal and contact details",       task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S1, label: "Confirm intended course and Australian institution",  task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S1, label: "Assess onshore vs offshore application pathway",      task_order: 3, is_required: true  },
    { id: uuid(), stage_id: S1, label: "Identify applicable stream (standard, school, etc.)", task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S1, label: "Check current visa status and expiry if onshore",     task_order: 5, is_required: false },
    { id: uuid(), stage_id: S1, label: "Discuss English requirement and exemptions",          task_order: 6, is_required: false },
    { id: uuid(), stage_id: S1, label: "Issue client engagement letter and fee agreement",    task_order: 7, is_required: true  },

    // Stage 2: Course and Provider
    { id: uuid(), stage_id: S2, label: "Confirm CRICOS-registered provider and course",      task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S2, label: "Verify course is eligible for student visa",          task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S2, label: "Review course duration and expected end date",        task_order: 3, is_required: true  },
    { id: uuid(), stage_id: S2, label: "Confirm OSHC requirement applies",                   task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S2, label: "Advise on packaged course rules if applicable",       task_order: 5, is_required: false },
    { id: uuid(), stage_id: S2, label: "Record provider CRICOS code and course code",         task_order: 6, is_required: true  },

    // Stage 3: CoE and OSHC
    { id: uuid(), stage_id: S3, label: "Request Confirmation of Enrolment from provider",    task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S3, label: "Verify CoE details match application data",           task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S3, label: "Record CoE number and issue/expiry dates",            task_order: 3, is_required: true  },
    { id: uuid(), stage_id: S3, label: "Confirm OSHC provider and coverage dates",            task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S3, label: "Upload CoE document to case",                         task_order: 5, is_required: true  },
    { id: uuid(), stage_id: S3, label: "Upload OSHC certificate or confirmation",             task_order: 6, is_required: true  },
    { id: uuid(), stage_id: S3, label: "Record OSHC policy number and dates in case",         task_order: 7, is_required: true  },

    // Stage 4: Document Collection
    { id: uuid(), stage_id: S4, label: "Request passport (valid at least 6 months beyond CoE)", task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S4, label: "Request academic transcripts and qualifications",      task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S4, label: "Request English test results (IELTS, PTE, etc.)",     task_order: 3, is_required: false },
    { id: uuid(), stage_id: S4, label: "Request financial evidence (bank statements, etc.)",  task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S4, label: "Request health assessment HAP ID (if required)",       task_order: 5, is_required: false },
    { id: uuid(), stage_id: S4, label: "Request police clearance certificates",               task_order: 6, is_required: false },
    { id: uuid(), stage_id: S4, label: "Collect overseas student health cover certificate",   task_order: 7, is_required: true  },
    { id: uuid(), stage_id: S4, label: "Review all documents for completeness",               task_order: 8, is_required: true  },
    { id: uuid(), stage_id: S4, label: "Flag missing or expiring documents to client",        task_order: 9, is_required: true  },

    // Stage 5: Financial Verification
    { id: uuid(), stage_id: S5, label: "Verify sufficient funds for tuition and living costs", task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S5, label: "Confirm funds source is acceptable (own, sponsor)",   task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S5, label: "Obtain financial sponsor letter if applicable",        task_order: 3, is_required: false },
    { id: uuid(), stage_id: S5, label: "Record financial sponsor details in case",             task_order: 4, is_required: false },
    { id: uuid(), stage_id: S5, label: "Check funds meet DIBP indicative cost estimates",     task_order: 5, is_required: true  },
    { id: uuid(), stage_id: S5, label: "Document financial verification outcome",              task_order: 6, is_required: true  },

    // Stage 6: GS Assessment and Drafting
    { id: uuid(), stage_id: S6, label: "Conduct Genuine Student assessment interview",         task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S6, label: "Draft GS statement addressing immigration history",   task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S6, label: "Draft GS statement addressing course rationale",       task_order: 3, is_required: true  },
    { id: uuid(), stage_id: S6, label: "Draft GS statement addressing ties to home country",  task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S6, label: "Client reviews and approves GS statement",             task_order: 5, is_required: true  },
    { id: uuid(), stage_id: S6, label: "Finalise and upload GS statement to case",             task_order: 6, is_required: true  },
    { id: uuid(), stage_id: S6, label: "Record GS approval status in case",                   task_order: 7, is_required: true  },

    // Stage 7: Application Preparation
    { id: uuid(), stage_id: S7, label: "Complete ImmiAccount application form",                task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S7, label: "Attach all supporting documents to application",       task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S7, label: "Verify all personal details match passport",           task_order: 3, is_required: true  },
    { id: uuid(), stage_id: S7, label: "Confirm CoE and OSHC numbers are correctly entered",  task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S7, label: "Calculate and confirm visa application charge (VAC)", task_order: 5, is_required: true  },
    { id: uuid(), stage_id: S7, label: "Client reviews and authorises application submission", task_order: 6, is_required: true  },
    { id: uuid(), stage_id: S7, label: "Conduct final pre-lodgement compliance check",         task_order: 7, is_required: true  },

    // Stage 8: Lodgement
    { id: uuid(), stage_id: S8, label: "Submit application via ImmiAccount",                   task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S8, label: "Record Transaction Reference Number (TRN)",            task_order: 2, is_required: true  },
    { id: uuid(), stage_id: S8, label: "Record lodgement date in case",                        task_order: 3, is_required: true  },
    { id: uuid(), stage_id: S8, label: "Send lodgement confirmation to client",                task_order: 4, is_required: true  },
    { id: uuid(), stage_id: S8, label: "Update case status to Post-Lodgement",                task_order: 5, is_required: true  },
    { id: uuid(), stage_id: S8, label: "Set bridging visa check reminder if onshore",          task_order: 6, is_required: false },

    // Stage 9: Post-Lodgement
    { id: uuid(), stage_id: S9, label: "Monitor application status in ImmiAccount",            task_order: 1, is_required: true  },
    { id: uuid(), stage_id: S9, label: "Respond to any Departmental requests for information", task_order: 2, is_required: false },
    { id: uuid(), stage_id: S9, label: "Advise client on travel during processing (BVA)",      task_order: 3, is_required: false },
    { id: uuid(), stage_id: S9, label: "Check health assessment finalisation if required",     task_order: 4, is_required: false },
    { id: uuid(), stage_id: S9, label: "Provide processing time updates to client",            task_order: 5, is_required: true  },
    { id: uuid(), stage_id: S9, label: "Prepare client for possible s.56 notice",              task_order: 6, is_required: false },

    // Stage 10: Outcome
    { id: uuid(), stage_id: S10, label: "Receive grant/refusal notification from Department",  task_order: 1,  is_required: true  },
    { id: uuid(), stage_id: S10, label: "Record outcome in case (grant or refusal)",           task_order: 2,  is_required: true  },
    // Grant path
    { id: uuid(), stage_id: S10, label: "[GRANT] Record visa grant number and expiry date",   task_order: 3,  is_required: false },
    { id: uuid(), stage_id: S10, label: "[GRANT] Advise client of visa conditions (8101, 8202, 8501, 8516, 8517)", task_order: 4, is_required: false },
    { id: uuid(), stage_id: S10, label: "[GRANT] Confirm enrolment commencement obligations", task_order: 5,  is_required: false },
    { id: uuid(), stage_id: S10, label: "[GRANT] Record grant date in case",                   task_order: 6,  is_required: false },
    { id: uuid(), stage_id: S10, label: "[GRANT] Update case status to Granted",               task_order: 7,  is_required: false },
    // Refusal path
    { id: uuid(), stage_id: S10, label: "[REFUSE] Advise client of refusal and grounds",      task_order: 8,  is_required: false },
    { id: uuid(), stage_id: S10, label: "[REFUSE] Assess merits review options (AAT)",        task_order: 9,  is_required: false },
    { id: uuid(), stage_id: S10, label: "[REFUSE] Lodge AAT review if instructed",             task_order: 10, is_required: false },
    { id: uuid(), stage_id: S10, label: "[REFUSE] Advise client on departure/BVB if onshore", task_order: 11, is_required: false },
    { id: uuid(), stage_id: S10, label: "[REFUSE] Update case status to Refused",              task_order: 12, is_required: false },
    // Common close
    { id: uuid(), stage_id: S10, label: "Archive and close case file",                        task_order: 13, is_required: true  },
  ];

  await ok("workflow_tasks", sb.from("workflow_tasks").insert(tasks));
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Wipe SC-500 and Reseed Workflow ===\n");

  console.log("\n── Finding SC-500 cases ──");
  const caseIds = await findSC500CaseIds();

  console.log("\n── Wiping case data ──");
  await wipeCaseData(caseIds);

  console.log("\n── Wiping old SC-500 workflow ──");
  await wipeOldWorkflow();

  await seedNewWorkflow();

  console.log("\n✅ Done! SC-500 data wiped and new 10-stage workflow seeded.\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  process.exit(1);
});
