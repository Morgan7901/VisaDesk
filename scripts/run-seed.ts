/**
 * run-seed.ts
 * Seeds workflow templates, case templates, and document types
 * for all visa subclasses using supabase-js (no raw SQL required).
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true,"skipLibCheck":true}' scripts/run-seed.ts
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
// WORKFLOW TEMPLATES
// ────────────────────────────────────────────────────────────

async function seedWorkflowTemplates() {
  console.log("\n── Workflow Templates ──");

  // IDs
  const T500 = uuid(), T482 = uuid(), T820 = uuid(),
        T309 = uuid(), T485 = uuid(), T600 = uuid();

  await ok("workflow_templates", sb.from("workflow_templates").insert([
    { id: T500, firm_id: null, visa_subclass: "500", label: "Student Visa (Subclass 500)",              description: "Workflow for student visa applications including Genuine Student assessment and CoE management." },
    { id: T482, firm_id: null, visa_subclass: "482", label: "Temporary Skill Shortage (Subclass 482)",  description: "Workflow for TSS visa applications covering sponsorship, nomination, and visa stages." },
    { id: T820, firm_id: null, visa_subclass: "820", label: "Partner Visa Onshore (Subclass 820/801)",  description: "Workflow for onshore partner visa applications from lodgement through to permanent residence." },
    { id: T309, firm_id: null, visa_subclass: "309", label: "Partner Visa Offshore (Subclass 309/100)", description: "Workflow for offshore partner visa applications including biometrics and overseas processing." },
    { id: T485, firm_id: null, visa_subclass: "485", label: "Temporary Graduate Visa (Subclass 485)",   description: "Workflow for temporary graduate visa applications." },
    { id: T600, firm_id: null, visa_subclass: "600", label: "Visitor Visa (Subclass 600)",              description: "Workflow for visitor visa applications covering tourist, business, and sponsored family streams." },
  ]));

  await seed500Workflow(T500);
  await seed482Workflow(T482);
  await seed820Workflow(T820);
  await seed309Workflow(T309);
  await seed485Workflow(T485);
  await seed600Workflow(T600);
}

async function seed500Workflow(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6,s7] = Array.from({length:7}, uuid);
  await ok("SC-500 stages", sb.from("workflow_stages").insert([
    { id:s1, template_id:tmpl, stage_order:1, label:"Onboarding",             icon:"UserPlus" },
    { id:s2, template_id:tmpl, stage_order:2, label:"Eligibility Assessment", icon:"ClipboardCheck" },
    { id:s3, template_id:tmpl, stage_order:3, label:"Document Collection",    icon:"FolderOpen" },
    { id:s4, template_id:tmpl, stage_order:4, label:"Application Preparation",icon:"FileText" },
    { id:s5, template_id:tmpl, stage_order:5, label:"Lodgement",              icon:"Send" },
    { id:s6, template_id:tmpl, stage_order:6, label:"Post-Lodgement",         icon:"Clock" },
    { id:s7, template_id:tmpl, stage_order:7, label:"Decision",               icon:"CheckCircle" },
  ]));
  await ok("SC-500 tasks", sb.from("workflow_tasks").insert([
    // Stage 1
    {stage_id:s1,task_order:1,label:"Obtain signed client agreement and retainer",         is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:2,label:"Collect passport and photo ID",                       is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:3,label:"Explain OSHC insurance requirement",                  is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:4,label:"Send client portal invite",                           is_required:true, trigger_type:"send_portal_invite",requires_portal:"client"},
    {stage_id:s1,task_order:5,label:"Create case file and assign reference number",        is_required:true, trigger_type:null,                requires_portal:null},
    // Stage 2
    {stage_id:s2,task_order:1,label:"Assess Genuine Student (GS) criteria",                is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:2,label:"Confirm course enrolment and CoE details",            is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:3,label:"Check English language requirement (IELTS/PTE/TOEFL)",is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:4,label:"Assess financial capacity",                           is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:5,label:"Check health and character requirements",             is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:6,label:"Advise client on eligibility outcome",                is_required:true, trigger_type:"send_email",requires_portal:null},
    // Stage 3
    {stage_id:s3,task_order:1,label:"Request documents from client via portal",            is_required:true, trigger_type:"document_request",requires_portal:"client"},
    {stage_id:s3,task_order:2,label:"Confirm CoE received from institution",               is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:3,label:"Confirm OSHC policy document received",               is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:4,label:"Confirm English test results received",               is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:5,label:"Confirm financial evidence received",                 is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:6,label:"Confirm health assessment booked",                    is_required:true, trigger_type:"create_deadline",  requires_portal:null},
    {stage_id:s3,task_order:7,label:"Confirm police clearances obtained",                  is_required:true, trigger_type:null,               requires_portal:null},
    // Stage 4
    {stage_id:s4,task_order:1,label:"Prepare Form 157A student visa application",          is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:2,label:"Prepare GS Statement with client",                    is_required:true, trigger_type:null,        requires_portal:"client"},
    {stage_id:s4,task_order:3,label:"Complete health examinations and obtain HAP ID",      is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:4,label:"Conduct final document review",                       is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:5,label:"Obtain client sign-off on application",               is_required:true, trigger_type:"send_email",requires_portal:null},
    // Stage 5
    {stage_id:s5,task_order:1,label:"Lodge application via ImmiAccount",                   is_required:true, trigger_type:null,              requires_portal:null},
    {stage_id:s5,task_order:2,label:"Record TRN (Transaction Reference Number)",           is_required:true, trigger_type:null,              requires_portal:null},
    {stage_id:s5,task_order:3,label:"Log lodgement to communications",                     is_required:true, trigger_type:"system_note",     requires_portal:null},
    {stage_id:s5,task_order:4,label:"Set bridging visa expiry deadline",                   is_required:true, trigger_type:"create_deadline", requires_portal:null},
    {stage_id:s5,task_order:5,label:"Send lodgement confirmation to client",               is_required:true, trigger_type:"send_email",      requires_portal:null},
    // Stage 6
    {stage_id:s6,task_order:1,label:"Monitor application status in ImmiAccount",           is_required:true,  trigger_type:null,requires_portal:null},
    {stage_id:s6,task_order:2,label:"Respond to any DHA requests for further information", is_required:false, trigger_type:null,requires_portal:null},
    {stage_id:s6,task_order:3,label:"Log health and character clearances as received",     is_required:false, trigger_type:null,requires_portal:null},
    {stage_id:s6,task_order:4,label:"Monitor processing times",                            is_required:false, trigger_type:null,requires_portal:null},
    // Stage 7
    {stage_id:s7,task_order:1,label:"Record grant date and visa expiry",                   is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s7,task_order:2,label:"Send grant notification to client",                   is_required:true, trigger_type:"send_email",   requires_portal:null},
    {stage_id:s7,task_order:3,label:"Record visa conditions (8105, 8202)",                 is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s7,task_order:4,label:"Update case status to granted",                       is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s7,task_order:5,label:"Archive case documents",                              is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s7,task_order:6,label:"Prompt final fee invoice",                            is_required:true, trigger_type:"trust_entry",  requires_portal:null},
  ]));
}

async function seed482Workflow(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6] = Array.from({length:6}, uuid);
  await ok("SC-482 stages", sb.from("workflow_stages").insert([
    { id:s1, template_id:tmpl, stage_order:1, label:"Onboarding",             icon:"UserPlus" },
    { id:s2, template_id:tmpl, stage_order:2, label:"Sponsorship",            icon:"Building2" },
    { id:s3, template_id:tmpl, stage_order:3, label:"Labour Market Testing",  icon:"Search" },
    { id:s4, template_id:tmpl, stage_order:4, label:"Nomination",             icon:"Briefcase" },
    { id:s5, template_id:tmpl, stage_order:5, label:"Visa Application",       icon:"FileText" },
    { id:s6, template_id:tmpl, stage_order:6, label:"Decision",               icon:"CheckCircle" },
  ]));
  await ok("SC-482 tasks", sb.from("workflow_tasks").insert([
    {stage_id:s1,task_order:1,label:"Obtain signed engagement letter from employer",       is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:2,label:"Obtain signed engagement letter from worker",         is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:3,label:"Confirm position details and ANZSCO code",           is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:4,label:"Confirm salary meets TSMIT ($73,150)",               is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:5,label:"Check worker passport and current visa status",      is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:6,label:"Send sponsor portal invite",                         is_required:true, trigger_type:"send_portal_invite",requires_portal:"sponsor"},
    {stage_id:s1,task_order:7,label:"Send client portal invite to worker",                is_required:true, trigger_type:"send_portal_invite",requires_portal:"client"},
    {stage_id:s2,task_order:1,label:"Confirm sponsor SBS status via DOHA",                is_required:true,  trigger_type:null,              requires_portal:null},
    {stage_id:s2,task_order:2,label:"If SBS not current, lodge Standard Business Sponsorship", is_required:false, trigger_type:null,         requires_portal:null},
    {stage_id:s2,task_order:3,label:"Upload sponsor financial documents",                 is_required:true,  trigger_type:null,              requires_portal:"sponsor"},
    {stage_id:s2,task_order:4,label:"Upload training record evidence",                    is_required:true,  trigger_type:null,              requires_portal:"sponsor"},
    {stage_id:s2,task_order:5,label:"Set SBS decision deadline",                          is_required:true,  trigger_type:"create_deadline", requires_portal:null},
    {stage_id:s2,task_order:6,label:"Record SBS approval and expiry date",                is_required:true,  trigger_type:null,              requires_portal:null},
    {stage_id:s3,task_order:1,label:"Confirm LMT exemption applies (FTA country or earnings above threshold)", is_required:false, trigger_type:null,             requires_portal:null},
    {stage_id:s3,task_order:2,label:"If LMT required, confirm job ads placed on Seek and LinkedIn",           is_required:false, trigger_type:null,             requires_portal:null},
    {stage_id:s3,task_order:3,label:"Collect copies of all job advertisements",           is_required:false, trigger_type:null,             requires_portal:null},
    {stage_id:s3,task_order:4,label:"Collect records of Australian applicant rejections", is_required:false, trigger_type:null,             requires_portal:null},
    {stage_id:s3,task_order:5,label:"Confirm 4-week advertising period completed",        is_required:false, trigger_type:"create_deadline",requires_portal:null},
    {stage_id:s3,task_order:6,label:"Prepare LMT summary document",                       is_required:false, trigger_type:null,             requires_portal:null},
    {stage_id:s4,task_order:1,label:"Prepare nomination application Form 1395",           is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s4,task_order:2,label:"Confirm position description completed by sponsor",  is_required:true, trigger_type:null,           requires_portal:"sponsor"},
    {stage_id:s4,task_order:3,label:"Upload all nomination supporting documents",         is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s4,task_order:4,label:"Confirm salary and TSMIT confirmed in writing",      is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s4,task_order:5,label:"Lodge nomination via ImmiAccount",                   is_required:true, trigger_type:null,           requires_portal:null},
    {stage_id:s4,task_order:6,label:"Record nomination TRN",                              is_required:true, trigger_type:"system_note",  requires_portal:null},
    {stage_id:s4,task_order:7,label:"Set nomination decision deadline",                   is_required:true, trigger_type:"create_deadline",requires_portal:null},
    {stage_id:s4,task_order:8,label:"Notify worker of nomination lodgement",              is_required:true, trigger_type:"send_email",   requires_portal:null},
    {stage_id:s5,task_order:1,label:"Confirm approved nomination received",               is_required:true,  trigger_type:null,               requires_portal:null},
    {stage_id:s5,task_order:2,label:"Request outstanding visa documents from worker",     is_required:true,  trigger_type:"document_request", requires_portal:"client"},
    {stage_id:s5,task_order:3,label:"Confirm health assessments booked",                  is_required:true,  trigger_type:"create_deadline",  requires_portal:null},
    {stage_id:s5,task_order:4,label:"Confirm skills assessment obtained if required",     is_required:false, trigger_type:null,               requires_portal:null},
    {stage_id:s5,task_order:5,label:"Confirm English language evidence obtained",         is_required:true,  trigger_type:null,               requires_portal:null},
    {stage_id:s5,task_order:6,label:"Prepare visa application Form 1066",                 is_required:true,  trigger_type:null,               requires_portal:null},
    {stage_id:s5,task_order:7,label:"Lodge visa application via ImmiAccount",             is_required:true,  trigger_type:null,               requires_portal:null},
    {stage_id:s5,task_order:8,label:"Record visa application TRN",                        is_required:true,  trigger_type:"system_note",      requires_portal:null},
    {stage_id:s5,task_order:9,label:"Send lodgement confirmation to worker",              is_required:true,  trigger_type:"send_email",       requires_portal:null},
    {stage_id:s6,task_order:1,label:"Monitor application in ImmiAccount",                 is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:2,label:"Respond to any DHA requests for further information",is_required:false, trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:3,label:"Record grant date and visa expiry (2 or 4 years)",   is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:4,label:"Record visa condition 8107 (must work for sponsor)", is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:5,label:"Send grant notification to worker and sponsor",      is_required:true,  trigger_type:"send_email",  requires_portal:null},
    {stage_id:s6,task_order:6,label:"Update case status to granted",                      is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:7,label:"Prompt final fee invoice",                           is_required:true,  trigger_type:"trust_entry", requires_portal:null},
  ]));
}

async function seed820Workflow(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6,s7] = Array.from({length:7}, uuid);
  await ok("SC-820 stages", sb.from("workflow_stages").insert([
    { id:s1, template_id:tmpl, stage_order:1, label:"Onboarding",              icon:"UserPlus" },
    { id:s2, template_id:tmpl, stage_order:2, label:"Sponsorship Assessment",  icon:"Heart" },
    { id:s3, template_id:tmpl, stage_order:3, label:"Document Collection",     icon:"FolderOpen" },
    { id:s4, template_id:tmpl, stage_order:4, label:"Application Preparation", icon:"FileText" },
    { id:s5, template_id:tmpl, stage_order:5, label:"Lodgement",               icon:"Send" },
    { id:s6, template_id:tmpl, stage_order:6, label:"Bridging Visa Period",    icon:"Clock" },
    { id:s7, template_id:tmpl, stage_order:7, label:"Decision",                icon:"CheckCircle" },
  ]));
  await ok("SC-820 tasks", sb.from("workflow_tasks").insert([
    {stage_id:s1,task_order:1,label:"Obtain signed client agreement and retainer",         is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:2,label:"Confirm sponsor citizenship/permanent residency",     is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:3,label:"Confirm relationship type (married or de facto)",     is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:4,label:"Collect passports for applicant and sponsor",        is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:5,label:"Send client portal invite",                          is_required:true, trigger_type:"send_portal_invite",requires_portal:"client"},
    {stage_id:s1,task_order:6,label:"Explain concurrent SC-820/801 process",              is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s2,task_order:1,label:"Assess sponsor eligibility (citizen/PR/eligible NZ)",is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s2,task_order:2,label:"Check sponsor not prohibited from sponsoring",        is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s2,task_order:3,label:"Check sponsor has no previous partner visa refusals", is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s2,task_order:4,label:"Confirm sponsor meets limitations on number of sponsorships", is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s2,task_order:5,label:"Assess genuine relationship evidence",                is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:1,label:"Request all documents via client portal",             is_required:true, trigger_type:"document_request", requires_portal:"client"},
    {stage_id:s3,task_order:2,label:"Collect evidence of financial aspects of relationship",is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:3,label:"Collect evidence of household aspects",               is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:4,label:"Collect evidence of social aspects",                  is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:5,label:"Collect evidence of commitment",                      is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:6,label:"Obtain Form 888 from two statutory witnesses",        is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:7,label:"Book health assessments via HAP",                     is_required:true, trigger_type:"create_deadline",requires_portal:null},
    {stage_id:s3,task_order:8,label:"Obtain police clearances for all required countries", is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s4,task_order:1,label:"Prepare sponsorship Form 40SP",                       is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:2,label:"Prepare visa application Form 47SP",                  is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:3,label:"Draft relationship statement for applicant",          is_required:true, trigger_type:null,        requires_portal:"client"},
    {stage_id:s4,task_order:4,label:"Draft relationship statement for sponsor",            is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:5,label:"Conduct final document review",                       is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:6,label:"Obtain client and sponsor sign-off",                  is_required:true, trigger_type:"send_email",requires_portal:null},
    {stage_id:s5,task_order:1,label:"Lodge SC-820 visa application and SC-309 sponsorship via ImmiAccount", is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:2,label:"Record TRN for both sponsorship and visa application",is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:3,label:"Log lodgement to communications",                     is_required:true, trigger_type:"system_note", requires_portal:null},
    {stage_id:s5,task_order:4,label:"Set bridging visa expiry deadline (BVA)",             is_required:true, trigger_type:"create_deadline",requires_portal:null},
    {stage_id:s5,task_order:5,label:"Send lodgement confirmation to client and sponsor",   is_required:true, trigger_type:"send_email",  requires_portal:null},
    {stage_id:s6,task_order:1,label:"Monitor application status in ImmiAccount",           is_required:true,  trigger_type:null,              requires_portal:null},
    {stage_id:s6,task_order:2,label:"Respond to any DHA requests for further information", is_required:false, trigger_type:null,              requires_portal:null},
    {stage_id:s6,task_order:3,label:"Monitor 2-year waiting period for SC-801",            is_required:true,  trigger_type:"create_deadline", requires_portal:null},
    {stage_id:s6,task_order:4,label:"Check health and character clearances as received",   is_required:false, trigger_type:null,              requires_portal:null},
    {stage_id:s6,task_order:5,label:"Update relationship evidence at SC-801 stage if required", is_required:false, trigger_type:null,         requires_portal:null},
    {stage_id:s7,task_order:1,label:"Record grant date and visa (SC-820 or SC-801)",       is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:2,label:"Send grant notification to client",                   is_required:true, trigger_type:"send_email",  requires_portal:null},
    {stage_id:s7,task_order:3,label:"Record visa conditions (no condition 8503)",          is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:4,label:"Update case status to granted",                       is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:5,label:"Archive case documents",                              is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:6,label:"Prompt final fee invoice",                            is_required:true, trigger_type:"trust_entry", requires_portal:null},
  ]));
}

async function seed309Workflow(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6,s7] = Array.from({length:7}, uuid);
  await ok("SC-309 stages", sb.from("workflow_stages").insert([
    { id:s1, template_id:tmpl, stage_order:1, label:"Onboarding",              icon:"UserPlus" },
    { id:s2, template_id:tmpl, stage_order:2, label:"Sponsorship Assessment",  icon:"Heart" },
    { id:s3, template_id:tmpl, stage_order:3, label:"Document Collection",     icon:"FolderOpen" },
    { id:s4, template_id:tmpl, stage_order:4, label:"Application Preparation", icon:"FileText" },
    { id:s5, template_id:tmpl, stage_order:5, label:"Lodgement",               icon:"Send" },
    { id:s6, template_id:tmpl, stage_order:6, label:"Processing Period",       icon:"Clock" },
    { id:s7, template_id:tmpl, stage_order:7, label:"Decision",                icon:"CheckCircle" },
  ]));
  await ok("SC-309 tasks", sb.from("workflow_tasks").insert([
    {stage_id:s1,task_order:1,label:"Obtain signed client agreement and retainer",         is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:2,label:"Confirm Australian sponsor citizenship/PR status",    is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:3,label:"Confirm relationship type (married or de facto)",     is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:4,label:"Collect passports for applicant and sponsor",        is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:5,label:"Confirm applicant location outside Australia",       is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:6,label:"Send client portal invite",                          is_required:true, trigger_type:"send_portal_invite",requires_portal:"client"},
    {stage_id:s1,task_order:7,label:"Explain concurrent SC-309/100 process and timeline", is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s2,task_order:1,label:"Assess sponsor eligibility (citizen/PR/eligible NZ)",is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:2,label:"Check sponsor not prohibited from sponsoring",        is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:3,label:"Check sponsor has no previous partner visa limitations",is_required:true, trigger_type:null,      requires_portal:null},
    {stage_id:s2,task_order:4,label:"Assess genuine relationship evidence",                is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:5,label:"Advise sponsor of obligations",                       is_required:true, trigger_type:"send_email",requires_portal:null},
    {stage_id:s3,task_order:1,label:"Request all documents via client portal",             is_required:true, trigger_type:"document_request",requires_portal:"client"},
    {stage_id:s3,task_order:2,label:"Collect evidence of financial aspects of relationship",is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:3,label:"Collect evidence of social aspects",                  is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:4,label:"Collect evidence of commitment",                      is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:5,label:"Obtain Form 888 from two statutory witnesses",        is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:6,label:"Arrange overseas health assessments via HAP",         is_required:true, trigger_type:"create_deadline",requires_portal:null},
    {stage_id:s3,task_order:7,label:"Obtain police clearances for all required countries", is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s3,task_order:8,label:"Arrange biometrics collection if required",           is_required:true, trigger_type:null,requires_portal:null},
    {stage_id:s4,task_order:1,label:"Prepare sponsorship Form 40SP",                       is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:2,label:"Prepare visa application Form 47SP",                  is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:3,label:"Draft relationship statement for applicant",          is_required:true, trigger_type:null,        requires_portal:"client"},
    {stage_id:s4,task_order:4,label:"Draft relationship statement for sponsor",            is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:5,label:"Conduct final document review",                       is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:6,label:"Obtain client and sponsor sign-off",                  is_required:true, trigger_type:"send_email",requires_portal:null},
    {stage_id:s5,task_order:1,label:"Lodge SC-309 visa application and sponsorship via ImmiAccount",is_required:true, trigger_type:null,         requires_portal:null},
    {stage_id:s5,task_order:2,label:"Record TRN for both sponsorship and visa application",is_required:true, trigger_type:null,         requires_portal:null},
    {stage_id:s5,task_order:3,label:"Log lodgement to communications",                     is_required:true, trigger_type:"system_note",requires_portal:null},
    {stage_id:s5,task_order:4,label:"Send lodgement confirmation to client and sponsor",   is_required:true, trigger_type:"send_email", requires_portal:null},
    {stage_id:s5,task_order:5,label:"Advise client of visa application acknowledgement payment", is_required:true, trigger_type:null,  requires_portal:null},
    {stage_id:s6,task_order:1,label:"Monitor application status in ImmiAccount",           is_required:true,  trigger_type:null,              requires_portal:null},
    {stage_id:s6,task_order:2,label:"Respond to any DHA requests for further information", is_required:false, trigger_type:null,              requires_portal:null},
    {stage_id:s6,task_order:3,label:"Monitor 2-year waiting period for SC-100 (permanent)",is_required:true,  trigger_type:"create_deadline", requires_portal:null},
    {stage_id:s6,task_order:4,label:"Check health and character clearances as received",   is_required:false, trigger_type:null,              requires_portal:null},
    {stage_id:s6,task_order:5,label:"Provide updated evidence at SC-100 stage if required",is_required:false, trigger_type:null,              requires_portal:null},
    {stage_id:s7,task_order:1,label:"Record grant date and visa (SC-309 or SC-100)",       is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:2,label:"Send grant notification to client",                   is_required:true, trigger_type:"send_email",  requires_portal:null},
    {stage_id:s7,task_order:3,label:"Record entry requirements and visa conditions",       is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:4,label:"Advise client to activate visa by entering Australia",is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:5,label:"Update case status to granted",                       is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:6,label:"Archive case documents",                              is_required:true, trigger_type:null,          requires_portal:null},
    {stage_id:s7,task_order:7,label:"Prompt final fee invoice",                            is_required:true, trigger_type:"trust_entry", requires_portal:null},
  ]));
}

async function seed485Workflow(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6] = Array.from({length:6}, uuid);
  await ok("SC-485 stages", sb.from("workflow_stages").insert([
    { id:s1, template_id:tmpl, stage_order:1, label:"Onboarding",             icon:"UserPlus" },
    { id:s2, template_id:tmpl, stage_order:2, label:"Eligibility Assessment", icon:"ClipboardCheck" },
    { id:s3, template_id:tmpl, stage_order:3, label:"Document Collection",    icon:"FolderOpen" },
    { id:s4, template_id:tmpl, stage_order:4, label:"Application Preparation",icon:"FileText" },
    { id:s5, template_id:tmpl, stage_order:5, label:"Lodgement",              icon:"Send" },
    { id:s6, template_id:tmpl, stage_order:6, label:"Decision",               icon:"CheckCircle" },
  ]));
  await ok("SC-485 tasks", sb.from("workflow_tasks").insert([
    {stage_id:s1,task_order:1,label:"Obtain signed client agreement and retainer",         is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:2,label:"Collect passport and current visa details",           is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:3,label:"Confirm stream (Graduate Work or Post-Study Work)",   is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:4,label:"Send client portal invite",                           is_required:true, trigger_type:"send_portal_invite",requires_portal:"client"},
    {stage_id:s1,task_order:5,label:"Create case file and assign reference number",        is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s2,task_order:1,label:"Confirm recent graduate (within 6 months of course completion)",     is_required:true,  trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:2,label:"Confirm study completed at CRICOS-registered provider in Australia", is_required:true,  trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:3,label:"Confirm at least 2 years full-time study in Australia",              is_required:true,  trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:4,label:"Check English language requirement (IELTS/PTE 6.0)",                 is_required:true,  trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:5,label:"For Graduate Work stream: confirm occupation on relevant list",       is_required:false, trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:6,label:"Check health and character requirements",                             is_required:true,  trigger_type:null,        requires_portal:null},
    {stage_id:s2,task_order:7,label:"Advise client on eligibility outcome",                                is_required:true,  trigger_type:"send_email",requires_portal:null},
    {stage_id:s3,task_order:1,label:"Request documents from client via portal",            is_required:true, trigger_type:"document_request", requires_portal:"client"},
    {stage_id:s3,task_order:2,label:"Confirm academic transcripts received",               is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:3,label:"Confirm qualification/degree certificate received",   is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:4,label:"Confirm English test results received (6.0 overall)", is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s3,task_order:5,label:"Confirm skills assessment received (Graduate Work stream)", is_required:false, trigger_type:null,          requires_portal:null},
    {stage_id:s3,task_order:6,label:"Book health assessment via HAP",                      is_required:true, trigger_type:"create_deadline",  requires_portal:null},
    {stage_id:s3,task_order:7,label:"Confirm police clearances obtained",                  is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s4,task_order:1,label:"Prepare Form 1066 visa application",                  is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:2,label:"Complete health examinations and obtain HAP ID",      is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:3,label:"Conduct final document review",                       is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s4,task_order:4,label:"Obtain client sign-off on application",               is_required:true, trigger_type:"send_email",requires_portal:null},
    {stage_id:s5,task_order:1,label:"Lodge application via ImmiAccount",                   is_required:true, trigger_type:null,              requires_portal:null},
    {stage_id:s5,task_order:2,label:"Record TRN",                                          is_required:true, trigger_type:null,              requires_portal:null},
    {stage_id:s5,task_order:3,label:"Log lodgement to communications",                     is_required:true, trigger_type:"system_note",     requires_portal:null},
    {stage_id:s5,task_order:4,label:"Set bridging visa expiry deadline",                   is_required:true, trigger_type:"create_deadline", requires_portal:null},
    {stage_id:s5,task_order:5,label:"Send lodgement confirmation to client",               is_required:true, trigger_type:"send_email",      requires_portal:null},
    {stage_id:s6,task_order:1,label:"Monitor application status in ImmiAccount",           is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:2,label:"Respond to any DHA requests for further information", is_required:false, trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:3,label:"Record grant date and visa expiry (2 or 4 years)",    is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:4,label:"Record visa conditions (8104, 8105)",                 is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:5,label:"Send grant notification to client",                   is_required:true,  trigger_type:"send_email",  requires_portal:null},
    {stage_id:s6,task_order:6,label:"Update case status to granted",                       is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:7,label:"Archive case documents",                              is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s6,task_order:8,label:"Prompt final fee invoice",                            is_required:true,  trigger_type:"trust_entry", requires_portal:null},
  ]));
}

async function seed600Workflow(tmpl: string) {
  const [s1,s2,s3,s4,s5] = Array.from({length:5}, uuid);
  await ok("SC-600 stages", sb.from("workflow_stages").insert([
    { id:s1, template_id:tmpl, stage_order:1, label:"Onboarding",             icon:"UserPlus" },
    { id:s2, template_id:tmpl, stage_order:2, label:"Document Collection",    icon:"FolderOpen" },
    { id:s3, template_id:tmpl, stage_order:3, label:"Application Preparation",icon:"FileText" },
    { id:s4, template_id:tmpl, stage_order:4, label:"Lodgement",              icon:"Send" },
    { id:s5, template_id:tmpl, stage_order:5, label:"Decision",               icon:"CheckCircle" },
  ]));
  await ok("SC-600 tasks", sb.from("workflow_tasks").insert([
    {stage_id:s1,task_order:1,label:"Obtain signed client agreement",                        is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:2,label:"Confirm visa stream (Tourist, Business, Sponsored Family)", is_required:true, trigger_type:null,            requires_portal:null},
    {stage_id:s1,task_order:3,label:"Collect passport and identity documents",               is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:4,label:"Confirm intended travel dates and duration",            is_required:true, trigger_type:null,                requires_portal:null},
    {stage_id:s1,task_order:5,label:"Send client portal invite",                             is_required:true, trigger_type:"send_portal_invite",requires_portal:"client"},
    {stage_id:s2,task_order:1,label:"Request documents from client via portal",              is_required:true, trigger_type:"document_request", requires_portal:"client"},
    {stage_id:s2,task_order:2,label:"Confirm passport validity (6 months beyond stay)",      is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s2,task_order:3,label:"Collect financial evidence (bank statements)",          is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s2,task_order:4,label:"Collect evidence of ties to home country",              is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s2,task_order:5,label:"Collect travel itinerary and purpose of visit",        is_required:true, trigger_type:null,               requires_portal:null},
    {stage_id:s2,task_order:6,label:"If Sponsored Family: collect Form 1163 from sponsor", is_required:false, trigger_type:null,               requires_portal:null},
    {stage_id:s2,task_order:7,label:"Confirm health insurance if required",                  is_required:false, trigger_type:null,              requires_portal:null},
    {stage_id:s3,task_order:1,label:"Complete online visitor visa application",              is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s3,task_order:2,label:"Confirm no condition 8503 on previous visa",           is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s3,task_order:3,label:"Conduct final document review",                        is_required:true, trigger_type:null,        requires_portal:null},
    {stage_id:s3,task_order:4,label:"Obtain client sign-off on application",                is_required:true, trigger_type:"send_email",requires_portal:null},
    {stage_id:s4,task_order:1,label:"Lodge application via ImmiAccount",                    is_required:true, trigger_type:null,              requires_portal:null},
    {stage_id:s4,task_order:2,label:"Record TRN",                                           is_required:true, trigger_type:null,              requires_portal:null},
    {stage_id:s4,task_order:3,label:"Log lodgement to communications",                      is_required:true, trigger_type:"system_note",     requires_portal:null},
    {stage_id:s4,task_order:4,label:"Send lodgement confirmation to client",                is_required:true, trigger_type:"send_email",      requires_portal:null},
    {stage_id:s5,task_order:1,label:"Monitor application status in ImmiAccount",            is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:2,label:"Respond to any DHA requests for further information",  is_required:false, trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:3,label:"Record grant date and visa conditions",                is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:4,label:"Record stay period and any condition 8101/8201",       is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:5,label:"Send grant notification to client",                    is_required:true,  trigger_type:"send_email",  requires_portal:null},
    {stage_id:s5,task_order:6,label:"Update case status to granted",                        is_required:true,  trigger_type:null,          requires_portal:null},
    {stage_id:s5,task_order:7,label:"Prompt final fee invoice",                             is_required:true,  trigger_type:"trust_entry", requires_portal:null},
  ]));
}

// ────────────────────────────────────────────────────────────
// CASE TEMPLATES
// ────────────────────────────────────────────────────────────

async function seedCaseTemplates() {
  console.log("\n── Case Templates ──");

  const T500=uuid(),T482=uuid(),T820=uuid(),T309=uuid(),T485=uuid(),T600=uuid();

  await ok("case_templates", sb.from("case_templates").insert([
    { id:T500, firm_id:null, visa_subclass:"500", name:"Student Visa (SC-500)",              is_system_default:true },
    { id:T482, firm_id:null, visa_subclass:"482", name:"Temporary Skill Shortage (SC-482)",  is_system_default:true },
    { id:T820, firm_id:null, visa_subclass:"820", name:"Partner Visa Onshore (SC-820/801)",  is_system_default:true },
    { id:T309, firm_id:null, visa_subclass:"309", name:"Partner Visa Offshore (SC-309/100)", is_system_default:true },
    { id:T485, firm_id:null, visa_subclass:"485", name:"Temporary Graduate Visa (SC-485)",   is_system_default:true },
    { id:T600, firm_id:null, visa_subclass:"600", name:"Visitor Visa (SC-600)",              is_system_default:true },
  ]));

  await seed500CaseTemplate(T500);
  await seed482CaseTemplate(T482);
  await seed820CaseTemplate(T820);
  await seed309CaseTemplate(T309);
  await seed485CaseTemplate(T485);
  await seed600CaseTemplate(T600);
}

async function seed500CaseTemplate(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6] = Array.from({length:6}, uuid);
  await ok("SC-500 case sections", sb.from("case_template_sections").insert([
    { id:s1, template_id:tmpl, title:"Course Details",     section_key:"course_details",     display_order:1 },
    { id:s2, template_id:tmpl, title:"Enrolment",          section_key:"enrolment",          display_order:2 },
    { id:s3, template_id:tmpl, title:"OSHC",               section_key:"oshc",               display_order:3 },
    { id:s4, template_id:tmpl, title:"English Evidence",   section_key:"english_evidence",   display_order:4 },
    { id:s5, template_id:tmpl, title:"Financial Capacity", section_key:"financial_capacity", display_order:5 },
    { id:s6, template_id:tmpl, title:"Visa History",       section_key:"visa_history",       display_order:6 },
  ]));
  await ok("SC-500 case fields", sb.from("case_template_fields").insert([
    {template_id:tmpl,section_id:s1,field_key:"course_name",       label:"Course Name",       field_type:"text",   required:true,  display_order:1},
    {template_id:tmpl,section_id:s1,field_key:"education_provider",label:"Education Provider",field_type:"text",   required:true,  display_order:2},
    {template_id:tmpl,section_id:s1,field_key:"campus_location",   label:"Campus Location",   field_type:"text",   required:false, display_order:3},
    {template_id:tmpl,section_id:s1,field_key:"course_level",      label:"Course Level",      field_type:"select", required:false, options:["Certificate","Diploma","Bachelor","Graduate Certificate","Graduate Diploma","Masters","PhD","ELICOS","Foundation"], display_order:4},
    {template_id:tmpl,section_id:s1,field_key:"course_start_date", label:"Course Start Date", field_type:"date",   required:true,  display_order:5},
    {template_id:tmpl,section_id:s1,field_key:"course_end_date",   label:"Course End Date",   field_type:"date",   required:true,  display_order:6},
    {template_id:tmpl,section_id:s2,field_key:"coe_number",          label:"CoE Number",           field_type:"text",  required:false, help_text:"Confirmation of Enrolment number from provider", display_order:1},
    {template_id:tmpl,section_id:s2,field_key:"coe_issue_date",      label:"CoE Issue Date",       field_type:"date",  required:false, display_order:2},
    {template_id:tmpl,section_id:s2,field_key:"coe_expiry_date",     label:"CoE Expiry Date",      field_type:"date",  required:false, display_order:3},
    {template_id:tmpl,section_id:s2,field_key:"provider_cricos_code",label:"Provider CRICOS Code", field_type:"text",  required:false, display_order:4},
    {template_id:tmpl,section_id:s3,field_key:"oshc_provider",      label:"OSHC Provider",  field_type:"text",  required:false, display_order:1},
    {template_id:tmpl,section_id:s3,field_key:"oshc_policy_number", label:"Policy Number",  field_type:"text",  required:false, display_order:2},
    {template_id:tmpl,section_id:s3,field_key:"oshc_start_date",    label:"OSHC Start Date",field_type:"date",  required:false, display_order:3},
    {template_id:tmpl,section_id:s3,field_key:"oshc_end_date",      label:"OSHC End Date",  field_type:"date",  required:false, display_order:4},
    {template_id:tmpl,section_id:s4,field_key:"english_test_type",    label:"Test Type",      field_type:"select",   required:false, options:["IELTS","PTE Academic","TOEFL iBT","Cambridge C1","OET","Exempt"], display_order:1},
    {template_id:tmpl,section_id:s4,field_key:"english_test_date",    label:"Test Date",      field_type:"date",     required:false, display_order:2},
    {template_id:tmpl,section_id:s4,field_key:"english_overall_score",label:"Overall Score",  field_type:"text",     required:false, display_order:3},
    {template_id:tmpl,section_id:s4,field_key:"english_listening",    label:"Listening",      field_type:"text",     required:false, display_order:4},
    {template_id:tmpl,section_id:s4,field_key:"english_reading",      label:"Reading",        field_type:"text",     required:false, display_order:5},
    {template_id:tmpl,section_id:s4,field_key:"english_writing",      label:"Writing",        field_type:"text",     required:false, display_order:6},
    {template_id:tmpl,section_id:s4,field_key:"english_speaking",     label:"Speaking",       field_type:"text",     required:false, display_order:7},
    {template_id:tmpl,section_id:s5,field_key:"funds_available",              label:"Funds Available",         field_type:"currency", required:false, help_text:"Living cost requirement: AUD $29,710/year", display_order:1},
    {template_id:tmpl,section_id:s5,field_key:"financial_sponsor_name",       label:"Sponsor Name",            field_type:"text",     required:false, display_order:2},
    {template_id:tmpl,section_id:s5,field_key:"financial_sponsor_relationship",label:"Sponsor Relationship",  field_type:"text",     required:false, display_order:3},
    {template_id:tmpl,section_id:s5,field_key:"funds_source",                 label:"Source of Funds",         field_type:"textarea", required:false, display_order:4},
    {template_id:tmpl,section_id:s6,field_key:"previous_australian_visas",label:"Previous Australian Visas",field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s6,field_key:"previous_visa_refusals",   label:"Previous Visa Refusals",   field_type:"checkbox",required:false, display_order:2},
    {template_id:tmpl,section_id:s6,field_key:"refusal_details",          label:"Refusal Details",          field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s6,field_key:"current_visa_subclass",    label:"Current Visa Subclass",    field_type:"text",    required:false, display_order:4},
    {template_id:tmpl,section_id:s6,field_key:"current_visa_expiry",      label:"Current Visa Expiry",      field_type:"date",    required:false, display_order:5},
  ]));
}

async function seed482CaseTemplate(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6] = Array.from({length:6}, uuid);
  await ok("SC-482 case sections", sb.from("case_template_sections").insert([
    { id:s1, template_id:tmpl, title:"Nomination Details",    section_key:"nomination_details",    display_order:1 },
    { id:s2, template_id:tmpl, title:"Salary and TSMIT",      section_key:"salary_tsmit",          display_order:2 },
    { id:s3, template_id:tmpl, title:"Sponsorship",           section_key:"sponsorship",           display_order:3 },
    { id:s4, template_id:tmpl, title:"Labour Market Testing", section_key:"labour_market_testing", display_order:4 },
    { id:s5, template_id:tmpl, title:"Worker Details",        section_key:"worker_details",        display_order:5 },
    { id:s6, template_id:tmpl, title:"Key Dates",             section_key:"key_dates",             display_order:6 },
  ]));
  await ok("SC-482 case fields", sb.from("case_template_fields").insert([
    {template_id:tmpl,section_id:s1,field_key:"nominated_position",label:"Nominated Position",field_type:"text",  required:true,  display_order:1},
    {template_id:tmpl,section_id:s1,field_key:"anzsco_code",       label:"ANZSCO Code",       field_type:"text",  required:true,  help_text:"6-digit ANZSCO occupation code", display_order:2},
    {template_id:tmpl,section_id:s1,field_key:"anzsco_title",      label:"ANZSCO Title",      field_type:"text",  required:false, display_order:3},
    {template_id:tmpl,section_id:s1,field_key:"employment_type",   label:"Employment Type",   field_type:"select",required:false, options:["Full-time","Part-time"], display_order:4},
    {template_id:tmpl,section_id:s1,field_key:"work_location",     label:"Work Location",     field_type:"text",  required:true,  display_order:5},
    {template_id:tmpl,section_id:s1,field_key:"visa_stream",       label:"Visa Stream",       field_type:"select",required:false, options:["Short-term","Medium-term","Labour Agreement"], display_order:6},
    {template_id:tmpl,section_id:s2,field_key:"salary_amount",          label:"Salary Amount",          field_type:"currency",required:true,  help_text:"Must meet TSMIT — currently $73,150", display_order:1},
    {template_id:tmpl,section_id:s2,field_key:"salary_includes_super",  label:"Salary Includes Super",  field_type:"checkbox",required:false, display_order:2},
    {template_id:tmpl,section_id:s2,field_key:"amsr_amount",            label:"AMSR Amount",            field_type:"currency",required:false, display_order:3},
    {template_id:tmpl,section_id:s2,field_key:"market_salary_evidence", label:"Market Salary Evidence", field_type:"textarea",required:false, display_order:4},
    {template_id:tmpl,section_id:s3,field_key:"sbs_status",        label:"SBS Status",       field_type:"select",  required:true,  options:["Not Applied","Pending","Approved","Expired"], display_order:1},
    {template_id:tmpl,section_id:s3,field_key:"sbs_approval_date", label:"SBS Approval Date",field_type:"date",    required:false, display_order:2},
    {template_id:tmpl,section_id:s3,field_key:"sbs_expiry_date",   label:"SBS Expiry Date",  field_type:"date",    required:false, display_order:3},
    {template_id:tmpl,section_id:s3,field_key:"sponsorship_obligations_acknowledged",label:"Obligations Acknowledged",field_type:"checkbox",required:false, display_order:4},
    {template_id:tmpl,section_id:s4,field_key:"lmt_required",      label:"LMT Required",      field_type:"checkbox",    required:false, display_order:1},
    {template_id:tmpl,section_id:s4,field_key:"lmt_exempt_reason", label:"LMT Exempt Reason", field_type:"select",      required:false, options:["FTA country — New Zealand","FTA country — Chile","FTA country — Korea","FTA country — Japan","FTA country — China","FTA country — ASEAN","Earnings above LMT threshold","International trade obligation","Other"], display_order:2},
    {template_id:tmpl,section_id:s4,field_key:"lmt_start_date",    label:"LMT Start Date",    field_type:"date",        required:false, display_order:3},
    {template_id:tmpl,section_id:s4,field_key:"lmt_end_date",      label:"LMT End Date",      field_type:"date",        required:false, display_order:4},
    {template_id:tmpl,section_id:s4,field_key:"lmt_platforms",     label:"LMT Platforms",     field_type:"multi_select",required:false, options:["Seek","LinkedIn","Indeed","Company Website","Other"], display_order:5},
    {template_id:tmpl,section_id:s4,field_key:"lmt_applications_received",label:"Applications Received",field_type:"number",required:false, display_order:6},
    {template_id:tmpl,section_id:s4,field_key:"lmt_australians_assessed", label:"Australians Assessed", field_type:"number",required:false, display_order:7},
    {template_id:tmpl,section_id:s4,field_key:"lmt_outcome_summary",      label:"LMT Outcome Summary",  field_type:"textarea",required:false, display_order:8},
    {template_id:tmpl,section_id:s5,field_key:"worker_qualification",      label:"Worker Qualification",      field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s5,field_key:"worker_experience",         label:"Worker Experience",         field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s5,field_key:"skills_assessment_required",label:"Skills Assessment Required",field_type:"checkbox", required:false, display_order:3},
    {template_id:tmpl,section_id:s5,field_key:"skills_assessment_body",    label:"Skills Assessment Body",    field_type:"text",    required:false, display_order:4},
    {template_id:tmpl,section_id:s5,field_key:"skills_assessment_status",  label:"Skills Assessment Status",  field_type:"select",  required:false, options:["Not Required","Not Started","In Progress","Approved","Refused"], display_order:5},
    {template_id:tmpl,section_id:s5,field_key:"skills_assessment_number",  label:"Skills Assessment Number",  field_type:"text",    required:false, display_order:6},
    {template_id:tmpl,section_id:s6,field_key:"nomination_lodgement_date",label:"Nomination Lodgement Date",field_type:"date",   required:false, display_order:1},
    {template_id:tmpl,section_id:s6,field_key:"nomination_trn",           label:"Nomination TRN",           field_type:"text",   required:false, display_order:2},
    {template_id:tmpl,section_id:s6,field_key:"nomination_decision_date", label:"Nomination Decision Date", field_type:"date",   required:false, display_order:3},
    {template_id:tmpl,section_id:s6,field_key:"nomination_status",        label:"Nomination Status",        field_type:"select", required:false, options:["Not Lodged","Pending","Approved","Refused"], display_order:4},
    {template_id:tmpl,section_id:s6,field_key:"visa_lodgement_date",      label:"Visa Lodgement Date",      field_type:"date",   required:false, display_order:5},
    {template_id:tmpl,section_id:s6,field_key:"visa_trn",                 label:"Visa TRN",                 field_type:"text",   required:false, display_order:6},
  ]));
}

async function seed820CaseTemplate(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6,s7,s8] = Array.from({length:8}, uuid);
  await ok("SC-820 case sections", sb.from("case_template_sections").insert([
    { id:s1, template_id:tmpl, title:"Sponsor Details",       section_key:"sponsor_details",       display_order:1 },
    { id:s2, template_id:tmpl, title:"Relationship Timeline", section_key:"relationship_timeline", display_order:2 },
    { id:s3, template_id:tmpl, title:"Financial Aspects",     section_key:"financial_aspects",     display_order:3 },
    { id:s4, template_id:tmpl, title:"Household Aspects",     section_key:"household_aspects",     display_order:4 },
    { id:s5, template_id:tmpl, title:"Social Aspects",        section_key:"social_aspects",        display_order:5 },
    { id:s6, template_id:tmpl, title:"Commitment Evidence",   section_key:"commitment_evidence",   display_order:6 },
    { id:s7, template_id:tmpl, title:"Form 888 Witnesses",    section_key:"form_888_witnesses",    display_order:7 },
    { id:s8, template_id:tmpl, title:"Visa History",          section_key:"visa_history",          display_order:8 },
  ]));
  await ok("SC-820 case fields", sb.from("case_template_fields").insert([
    {template_id:tmpl,section_id:s1,field_key:"sponsor_full_name",      label:"Sponsor Full Name",      field_type:"text",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_date_of_birth",  label:"Sponsor Date of Birth",  field_type:"date",    required:false, display_order:2},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_citizenship",    label:"Sponsor Citizenship",    field_type:"text",    required:true,  display_order:3},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_passport_number",label:"Sponsor Passport Number",field_type:"text",    required:false, display_order:4},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_address",        label:"Sponsor Address",        field_type:"textarea",required:false, display_order:5},
    {template_id:tmpl,section_id:s2,field_key:"first_met_date",              label:"First Met Date",              field_type:"date",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s2,field_key:"relationship_start_date",     label:"Relationship Start Date",     field_type:"date",    required:true,  display_order:2},
    {template_id:tmpl,section_id:s2,field_key:"committed_relationship_date", label:"Committed Relationship Date", field_type:"date",    required:false, display_order:3},
    {template_id:tmpl,section_id:s2,field_key:"cohabitation_start_date",     label:"Cohabitation Start Date",     field_type:"date",    required:false, display_order:4},
    {template_id:tmpl,section_id:s2,field_key:"marriage_date",               label:"Marriage Date",               field_type:"date",    required:false, display_order:5},
    {template_id:tmpl,section_id:s2,field_key:"relationship_type",           label:"Relationship Type",           field_type:"select",  required:false, options:["Married","De Facto","Prospective Marriage"], display_order:6},
    {template_id:tmpl,section_id:s2,field_key:"how_couple_met",              label:"How Couple Met",              field_type:"textarea",required:false, display_order:7},
    {template_id:tmpl,section_id:s3,field_key:"joint_bank_accounts",              label:"Joint Bank Accounts",              field_type:"checkbox",required:false, display_order:1},
    {template_id:tmpl,section_id:s3,field_key:"joint_assets",                     label:"Joint Assets",                     field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s3,field_key:"financial_interdependence_summary",label:"Financial Interdependence Summary", field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s4,field_key:"shared_residence",           label:"Shared Residence",           field_type:"checkbox",required:false, display_order:1},
    {template_id:tmpl,section_id:s4,field_key:"shared_address_details",     label:"Shared Address Details",     field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s4,field_key:"household_responsibilities", label:"Household Responsibilities", field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s5,field_key:"social_recognition_summary",label:"Social Recognition Summary",field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s5,field_key:"joint_travel",              label:"Joint Travel",              field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s5,field_key:"mutual_friends_summary",    label:"Mutual Friends Summary",    field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s6,field_key:"future_plans",       label:"Future Plans",       field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s6,field_key:"commitment_summary", label:"Commitment Summary", field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s7,field_key:"witness_1_name",         label:"Witness 1 Name",         field_type:"text",required:false, display_order:1},
    {template_id:tmpl,section_id:s7,field_key:"witness_1_citizenship",   label:"Witness 1 Citizenship",  field_type:"text",required:false, display_order:2},
    {template_id:tmpl,section_id:s7,field_key:"witness_1_relationship",  label:"Witness 1 Relationship", field_type:"text",required:false, display_order:3},
    {template_id:tmpl,section_id:s7,field_key:"witness_2_name",         label:"Witness 2 Name",         field_type:"text",required:false, display_order:4},
    {template_id:tmpl,section_id:s7,field_key:"witness_2_citizenship",   label:"Witness 2 Citizenship",  field_type:"text",required:false, display_order:5},
    {template_id:tmpl,section_id:s7,field_key:"witness_2_relationship",  label:"Witness 2 Relationship", field_type:"text",required:false, display_order:6},
    {template_id:tmpl,section_id:s8,field_key:"applicant_current_visa",label:"Applicant Current Visa",field_type:"text",    required:false, display_order:1},
    {template_id:tmpl,section_id:s8,field_key:"applicant_visa_expiry", label:"Applicant Visa Expiry", field_type:"date",    required:false, display_order:2},
    {template_id:tmpl,section_id:s8,field_key:"previous_partner_visa", label:"Previous Partner Visa", field_type:"checkbox",required:false, display_order:3},
    {template_id:tmpl,section_id:s8,field_key:"previous_relationships",label:"Previous Relationships",field_type:"textarea",required:false, display_order:4},
  ]));
}

async function seed309CaseTemplate(tmpl: string) {
  const [s1,s2,s3,s4,s5,s6,s7,s8] = Array.from({length:8}, uuid);
  await ok("SC-309 case sections", sb.from("case_template_sections").insert([
    { id:s1, template_id:tmpl, title:"Sponsor Details",       section_key:"sponsor_details",       display_order:1 },
    { id:s2, template_id:tmpl, title:"Relationship Timeline", section_key:"relationship_timeline", display_order:2 },
    { id:s3, template_id:tmpl, title:"Financial Aspects",     section_key:"financial_aspects",     display_order:3 },
    { id:s4, template_id:tmpl, title:"Social Aspects",        section_key:"social_aspects",        display_order:4 },
    { id:s5, template_id:tmpl, title:"Commitment Evidence",   section_key:"commitment_evidence",   display_order:5 },
    { id:s6, template_id:tmpl, title:"Form 888 Witnesses",    section_key:"form_888_witnesses",    display_order:6 },
    { id:s7, template_id:tmpl, title:"Applicant Location",    section_key:"applicant_location",    display_order:7 },
    { id:s8, template_id:tmpl, title:"Visa History",          section_key:"visa_history",          display_order:8 },
  ]));
  await ok("SC-309 case fields", sb.from("case_template_fields").insert([
    {template_id:tmpl,section_id:s1,field_key:"sponsor_full_name",      label:"Sponsor Full Name",             field_type:"text",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_date_of_birth",  label:"Sponsor Date of Birth",         field_type:"date",    required:false, display_order:2},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_citizenship",    label:"Sponsor Citizenship",           field_type:"text",    required:true,  display_order:3},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_passport_number",label:"Sponsor Passport Number",       field_type:"text",    required:false, display_order:4},
    {template_id:tmpl,section_id:s1,field_key:"sponsor_address",        label:"Sponsor Australian Address",    field_type:"textarea",required:false, display_order:5},
    {template_id:tmpl,section_id:s2,field_key:"first_met_date",              label:"First Met Date",              field_type:"date",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s2,field_key:"relationship_start_date",     label:"Relationship Start Date",     field_type:"date",    required:true,  display_order:2},
    {template_id:tmpl,section_id:s2,field_key:"committed_relationship_date", label:"Committed Relationship Date", field_type:"date",    required:false, display_order:3},
    {template_id:tmpl,section_id:s2,field_key:"marriage_date",               label:"Marriage Date",               field_type:"date",    required:false, display_order:4},
    {template_id:tmpl,section_id:s2,field_key:"relationship_type",           label:"Relationship Type",           field_type:"select",  required:false, options:["Married","De Facto","Prospective Marriage"], display_order:5},
    {template_id:tmpl,section_id:s2,field_key:"how_couple_met",              label:"How Couple Met",              field_type:"textarea",required:false, display_order:6},
    {template_id:tmpl,section_id:s2,field_key:"time_spent_together",         label:"Time Spent Together",         field_type:"textarea",required:false, display_order:7},
    {template_id:tmpl,section_id:s3,field_key:"joint_bank_accounts",              label:"Joint Bank Accounts",              field_type:"checkbox",required:false, display_order:1},
    {template_id:tmpl,section_id:s3,field_key:"joint_assets",                     label:"Joint Assets",                     field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s3,field_key:"financial_interdependence_summary",label:"Financial Interdependence Summary", field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s4,field_key:"social_recognition_summary",label:"Social Recognition Summary",field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s4,field_key:"joint_travel",              label:"Joint Travel",              field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s4,field_key:"mutual_friends_summary",    label:"Mutual Friends Summary",    field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s5,field_key:"future_plans",       label:"Future Plans",       field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s5,field_key:"commitment_summary", label:"Commitment Summary", field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s6,field_key:"witness_1_name",         label:"Witness 1 Name",         field_type:"text",required:false, display_order:1},
    {template_id:tmpl,section_id:s6,field_key:"witness_1_citizenship",  label:"Witness 1 Citizenship",  field_type:"text",required:false, display_order:2},
    {template_id:tmpl,section_id:s6,field_key:"witness_1_relationship", label:"Witness 1 Relationship", field_type:"text",required:false, display_order:3},
    {template_id:tmpl,section_id:s6,field_key:"witness_2_name",         label:"Witness 2 Name",         field_type:"text",required:false, display_order:4},
    {template_id:tmpl,section_id:s6,field_key:"witness_2_citizenship",  label:"Witness 2 Citizenship",  field_type:"text",required:false, display_order:5},
    {template_id:tmpl,section_id:s6,field_key:"witness_2_relationship", label:"Witness 2 Relationship", field_type:"text",required:false, display_order:6},
    {template_id:tmpl,section_id:s7,field_key:"applicant_country",          label:"Applicant Country",          field_type:"text",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s7,field_key:"applicant_city",             label:"Applicant City",             field_type:"text",    required:false, display_order:2},
    {template_id:tmpl,section_id:s7,field_key:"nearest_australian_mission", label:"Nearest Australian Mission", field_type:"text",    required:false, display_order:3},
    {template_id:tmpl,section_id:s7,field_key:"biometrics_required",        label:"Biometrics Required",        field_type:"checkbox",required:false, display_order:4},
    {template_id:tmpl,section_id:s7,field_key:"biometrics_status",          label:"Biometrics Status",          field_type:"select",  required:false, options:["Not Required","Pending","Completed"], display_order:5},
    {template_id:tmpl,section_id:s8,field_key:"previous_australian_visas",label:"Previous Australian Visas",field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s8,field_key:"previous_visa_refusals",   label:"Previous Visa Refusals",   field_type:"checkbox",required:false, display_order:2},
    {template_id:tmpl,section_id:s8,field_key:"refusal_details",          label:"Refusal Details",          field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s8,field_key:"previous_partner_visa",    label:"Previous Partner Visa",    field_type:"checkbox",required:false, display_order:4},
  ]));
}

async function seed485CaseTemplate(tmpl: string) {
  const [s1,s2,s3,s4,s5] = Array.from({length:5}, uuid);
  await ok("SC-485 case sections", sb.from("case_template_sections").insert([
    { id:s1, template_id:tmpl, title:"Course Details",     section_key:"course_details",     display_order:1 },
    { id:s2, template_id:tmpl, title:"Graduation Details", section_key:"graduation_details", display_order:2 },
    { id:s3, template_id:tmpl, title:"English Evidence",   section_key:"english_evidence",   display_order:3 },
    { id:s4, template_id:tmpl, title:"Skills Assessment",  section_key:"skills_assessment",  display_order:4 },
    { id:s5, template_id:tmpl, title:"Visa History",       section_key:"visa_history",       display_order:5 },
  ]));
  await ok("SC-485 case fields", sb.from("case_template_fields").insert([
    {template_id:tmpl,section_id:s1,field_key:"course_name",       label:"Course Name",       field_type:"text",   required:true,  display_order:1},
    {template_id:tmpl,section_id:s1,field_key:"education_provider",label:"Education Provider",field_type:"text",   required:true,  display_order:2},
    {template_id:tmpl,section_id:s1,field_key:"campus_location",   label:"Campus Location",   field_type:"text",   required:false, display_order:3},
    {template_id:tmpl,section_id:s1,field_key:"course_level",      label:"Course Level",      field_type:"select", required:true,  options:["Diploma","Bachelor","Graduate Certificate","Graduate Diploma","Masters","PhD"], display_order:4},
    {template_id:tmpl,section_id:s1,field_key:"course_start_date", label:"Course Start Date", field_type:"date",   required:false, display_order:5},
    {template_id:tmpl,section_id:s1,field_key:"course_end_date",   label:"Course End Date",   field_type:"date",   required:true,  display_order:6},
    {template_id:tmpl,section_id:s1,field_key:"cricos_code",       label:"CRICOS Code",       field_type:"text",   required:false, display_order:7},
    {template_id:tmpl,section_id:s2,field_key:"graduation_date",             label:"Graduation Date",             field_type:"date",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s2,field_key:"transcript_received",         label:"Transcript Received",         field_type:"checkbox",required:false, display_order:2},
    {template_id:tmpl,section_id:s2,field_key:"degree_certificate_received", label:"Degree Certificate Received", field_type:"checkbox",required:false, display_order:3},
    {template_id:tmpl,section_id:s2,field_key:"visa_stream",                 label:"Visa Stream",                 field_type:"select",  required:true,  options:["Graduate Work Stream","Post-Study Work Stream"], display_order:4},
    {template_id:tmpl,section_id:s2,field_key:"occupation_if_gw",            label:"Occupation (Graduate Work)",  field_type:"text",    required:false, display_order:5},
    {template_id:tmpl,section_id:s2,field_key:"anzsco_code",                 label:"ANZSCO Code",                 field_type:"text",    required:false, display_order:6},
    {template_id:tmpl,section_id:s3,field_key:"english_test_type",    label:"Test Type",     field_type:"select",required:true,  options:["IELTS","PTE Academic","TOEFL iBT","Cambridge C1","OET","Exempt"], display_order:1},
    {template_id:tmpl,section_id:s3,field_key:"english_test_date",    label:"Test Date",     field_type:"date",  required:false, display_order:2},
    {template_id:tmpl,section_id:s3,field_key:"english_overall_score",label:"Overall Score", field_type:"text",  required:true,  help_text:"Minimum 6.0 overall", display_order:3},
    {template_id:tmpl,section_id:s3,field_key:"english_listening",    label:"Listening",     field_type:"text",  required:false, display_order:4},
    {template_id:tmpl,section_id:s3,field_key:"english_reading",      label:"Reading",       field_type:"text",  required:false, display_order:5},
    {template_id:tmpl,section_id:s3,field_key:"english_writing",      label:"Writing",       field_type:"text",  required:false, display_order:6},
    {template_id:tmpl,section_id:s3,field_key:"english_speaking",     label:"Speaking",      field_type:"text",  required:false, display_order:7},
    {template_id:tmpl,section_id:s4,field_key:"skills_assessment_required",label:"Skills Assessment Required",field_type:"checkbox",required:false, display_order:1},
    {template_id:tmpl,section_id:s4,field_key:"skills_assessment_body",    label:"Assessing Body",            field_type:"text",    required:false, display_order:2},
    {template_id:tmpl,section_id:s4,field_key:"skills_assessment_status",  label:"Assessment Status",         field_type:"select",  required:false, options:["Not Required","Not Started","In Progress","Approved","Refused"], display_order:3},
    {template_id:tmpl,section_id:s4,field_key:"skills_assessment_number",  label:"Assessment Number",         field_type:"text",    required:false, display_order:4},
    {template_id:tmpl,section_id:s4,field_key:"skills_assessment_expiry",  label:"Assessment Expiry",         field_type:"date",    required:false, display_order:5},
    {template_id:tmpl,section_id:s5,field_key:"current_visa_subclass",  label:"Current Visa Subclass",  field_type:"text",    required:false, display_order:1},
    {template_id:tmpl,section_id:s5,field_key:"current_visa_expiry",    label:"Current Visa Expiry",    field_type:"date",    required:false, display_order:2},
    {template_id:tmpl,section_id:s5,field_key:"student_visa_grant_date",label:"Student Visa Grant Date",field_type:"date",    required:false, display_order:3},
    {template_id:tmpl,section_id:s5,field_key:"previous_visa_refusals", label:"Previous Visa Refusals", field_type:"checkbox",required:false, display_order:4},
    {template_id:tmpl,section_id:s5,field_key:"refusal_details",        label:"Refusal Details",        field_type:"textarea",required:false, display_order:5},
  ]));
}

async function seed600CaseTemplate(tmpl: string) {
  const [s1,s2,s3,s4,s5] = Array.from({length:5}, uuid);
  await ok("SC-600 case sections", sb.from("case_template_sections").insert([
    { id:s1, template_id:tmpl, title:"Travel Details",       section_key:"travel_details",     display_order:1 },
    { id:s2, template_id:tmpl, title:"Financial Evidence",   section_key:"financial_evidence", display_order:2 },
    { id:s3, template_id:tmpl, title:"Ties to Home Country", section_key:"home_country_ties",  display_order:3 },
    { id:s4, template_id:tmpl, title:"Sponsor Details",      section_key:"sponsor_details",    display_order:4 },
    { id:s5, template_id:tmpl, title:"Visa History",         section_key:"visa_history",       display_order:5 },
  ]));
  await ok("SC-600 case fields", sb.from("case_template_fields").insert([
    {template_id:tmpl,section_id:s1,field_key:"visa_stream",           label:"Visa Stream",             field_type:"select",  required:true,  options:["Tourist","Business Visitor","Sponsored Family Visitor","Approved Destination Status"], display_order:1},
    {template_id:tmpl,section_id:s1,field_key:"intended_arrival_date", label:"Intended Arrival Date",   field_type:"date",    required:false, display_order:2},
    {template_id:tmpl,section_id:s1,field_key:"intended_departure_date",label:"Intended Departure Date",field_type:"date",    required:false, display_order:3},
    {template_id:tmpl,section_id:s1,field_key:"length_of_stay",        label:"Length of Stay (days)",   field_type:"number",  required:true,  display_order:4},
    {template_id:tmpl,section_id:s1,field_key:"purpose_of_visit",      label:"Purpose of Visit",        field_type:"textarea",required:true,  display_order:5},
    {template_id:tmpl,section_id:s1,field_key:"states_to_visit",       label:"States to Visit",         field_type:"text",    required:false, display_order:6},
    {template_id:tmpl,section_id:s2,field_key:"funds_available",          label:"Funds Available (AUD)",  field_type:"currency",required:false, display_order:1},
    {template_id:tmpl,section_id:s2,field_key:"financial_evidence_types", label:"Financial Evidence Types",field_type:"textarea",required:false, display_order:2},
    {template_id:tmpl,section_id:s2,field_key:"employment_status",        label:"Employment Status",       field_type:"text",    required:false, display_order:3},
    {template_id:tmpl,section_id:s2,field_key:"employer_name",            label:"Employer Name",           field_type:"text",    required:false, display_order:4},
    {template_id:tmpl,section_id:s2,field_key:"annual_income",            label:"Annual Income",           field_type:"currency",required:false, display_order:5},
    {template_id:tmpl,section_id:s3,field_key:"home_country",            label:"Home Country",             field_type:"text",    required:true,  display_order:1},
    {template_id:tmpl,section_id:s3,field_key:"property_owned",          label:"Property Owned",           field_type:"checkbox",required:false, display_order:2},
    {template_id:tmpl,section_id:s3,field_key:"family_ties_summary",     label:"Family Ties",              field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s3,field_key:"employment_ties_summary", label:"Employment Ties",          field_type:"textarea",required:false, display_order:4},
    {template_id:tmpl,section_id:s3,field_key:"other_ties_summary",      label:"Other Ties to Home Country",field_type:"textarea",required:false, display_order:5},
    {template_id:tmpl,section_id:s4,field_key:"sponsor_name",         label:"Sponsor Name",              field_type:"text",    required:false, display_order:1},
    {template_id:tmpl,section_id:s4,field_key:"sponsor_visa_status",  label:"Sponsor Visa Status",       field_type:"text",    required:false, display_order:2},
    {template_id:tmpl,section_id:s4,field_key:"sponsor_relationship", label:"Relationship to Applicant", field_type:"text",    required:false, display_order:3},
    {template_id:tmpl,section_id:s4,field_key:"sponsor_address",      label:"Sponsor Australian Address",field_type:"textarea",required:false, display_order:4},
    {template_id:tmpl,section_id:s5,field_key:"previous_australian_visas",label:"Previous Australian Visas",field_type:"textarea",required:false, display_order:1},
    {template_id:tmpl,section_id:s5,field_key:"previous_visa_refusals",   label:"Previous Visa Refusals",   field_type:"checkbox",required:false, display_order:2},
    {template_id:tmpl,section_id:s5,field_key:"refusal_details",          label:"Refusal Details",          field_type:"textarea",required:false, display_order:3},
    {template_id:tmpl,section_id:s5,field_key:"condition_8503_held",      label:"Has Condition 8503",       field_type:"checkbox",required:false, display_order:4},
    {template_id:tmpl,section_id:s5,field_key:"waiver_required",          label:"Waiver Required",          field_type:"checkbox",required:false, display_order:5},
  ]));
}

// ────────────────────────────────────────────────────────────
// DOCUMENT TYPES
// ────────────────────────────────────────────────────────────

async function seedDocumentTypes() {
  console.log("\n── Document Types ──");

  // Check what's already seeded so we don't duplicate
  const { data: existing } = await sb.from("document_types").select("visa_subclass");
  const seeded = new Set((existing ?? []).map((r: {visa_subclass: string}) => r.visa_subclass));

  const all: { visa_subclass: string; label: string; is_required: boolean; portal_upload: string | null }[] = [];

  if (!seeded.has("500")) {
    all.push(
      { visa_subclass:"500", label:"Passport (bio data page)",              is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"Confirmation of Enrolment (CoE)",       is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"OSHC insurance policy",                 is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"English language test results",         is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"Financial evidence (bank statements)",  is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"Health assessment (HAP)",               is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"National police clearance",             is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"GS Statement",                         is_required:true,  portal_upload:"client" },
      { visa_subclass:"500", label:"Visa application form (Form 157A)",     is_required:true,  portal_upload:null    }
    );
  }
  if (!seeded.has("482")) {
    all.push(
      { visa_subclass:"482", label:"Worker passport",                       is_required:true,  portal_upload:"client"  },
      { visa_subclass:"482", label:"Skills assessment certificate",         is_required:true,  portal_upload:"client"  },
      { visa_subclass:"482", label:"English language evidence",             is_required:true,  portal_upload:"client"  },
      { visa_subclass:"482", label:"Employment reference letters",          is_required:true,  portal_upload:"client"  },
      { visa_subclass:"482", label:"Health assessment",                     is_required:true,  portal_upload:"client"  },
      { visa_subclass:"482", label:"Police clearance",                      is_required:true,  portal_upload:"client"  },
      { visa_subclass:"482", label:"Position description",                  is_required:true,  portal_upload:"sponsor" },
      { visa_subclass:"482", label:"Company financials (2 years)",          is_required:true,  portal_upload:"sponsor" },
      { visa_subclass:"482", label:"Training records",                      is_required:true,  portal_upload:"sponsor" },
      { visa_subclass:"482", label:"Labour market testing evidence",        is_required:true,  portal_upload:null      },
      { visa_subclass:"482", label:"Nomination form (Form 1395)",           is_required:true,  portal_upload:null      },
      { visa_subclass:"482", label:"Visa application form (Form 1066)",     is_required:true,  portal_upload:null      }
    );
  }
  if (!seeded.has("820")) {
    all.push(
      { visa_subclass:"820", label:"Applicant passport (bio data page)",             is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Sponsor passport or citizenship certificate",    is_required:true,  portal_upload:null    },
      { visa_subclass:"820", label:"Marriage certificate (if married)",              is_required:false, portal_upload:"client" },
      { visa_subclass:"820", label:"Relationship statement — applicant",             is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Relationship statement — sponsor",               is_required:true,  portal_upload:null    },
      { visa_subclass:"820", label:"Form 888 — Witness 1",                          is_required:true,  portal_upload:null    },
      { visa_subclass:"820", label:"Form 888 — Witness 2",                          is_required:true,  portal_upload:null    },
      { visa_subclass:"820", label:"Evidence of financial interdependence",         is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Evidence of shared household",                  is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Evidence of social recognition",                is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Photos together (chronological)",               is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Health assessment (HAP)",                       is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Police clearance — home country",               is_required:true,  portal_upload:"client" },
      { visa_subclass:"820", label:"Visa application form (Form 47SP)",             is_required:true,  portal_upload:null    },
      { visa_subclass:"820", label:"Sponsorship form (Form 40SP)",                  is_required:true,  portal_upload:null    }
    );
  }
  if (!seeded.has("309")) {
    all.push(
      { visa_subclass:"309", label:"Applicant passport (bio data page)",             is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Sponsor passport or citizenship certificate",    is_required:true,  portal_upload:null    },
      { visa_subclass:"309", label:"Marriage certificate (if married)",              is_required:false, portal_upload:"client" },
      { visa_subclass:"309", label:"Relationship statement — applicant",             is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Relationship statement — sponsor",               is_required:true,  portal_upload:null    },
      { visa_subclass:"309", label:"Form 888 — Witness 1",                          is_required:true,  portal_upload:null    },
      { visa_subclass:"309", label:"Form 888 — Witness 2",                          is_required:true,  portal_upload:null    },
      { visa_subclass:"309", label:"Evidence of financial interdependence",         is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Evidence of social recognition",                is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Photos together (chronological)",               is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Communication records (messages/calls)",        is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Health assessment (overseas HAP)",              is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Police clearance — home country",               is_required:true,  portal_upload:"client" },
      { visa_subclass:"309", label:"Biometrics proof (if required)",                is_required:false, portal_upload:"client" },
      { visa_subclass:"309", label:"Visa application form (Form 47SP)",             is_required:true,  portal_upload:null    },
      { visa_subclass:"309", label:"Sponsorship form (Form 40SP)",                  is_required:true,  portal_upload:null    }
    );
  }
  if (!seeded.has("485")) {
    all.push(
      { visa_subclass:"485", label:"Passport (bio data page)",                      is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"Academic transcripts",                          is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"Degree/qualification certificate",              is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"CoE or letter of completion from institution",  is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"English language test results (IELTS/PTE 6.0)", is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"Skills assessment certificate (Graduate Work)", is_required:false, portal_upload:"client" },
      { visa_subclass:"485", label:"Health assessment (HAP)",                       is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"Police clearance",                              is_required:true,  portal_upload:"client" },
      { visa_subclass:"485", label:"Visa application form (Form 1066)",             is_required:true,  portal_upload:null    }
    );
  }
  if (!seeded.has("600")) {
    all.push(
      { visa_subclass:"600", label:"Passport (bio data page)",                      is_required:true,  portal_upload:"client" },
      { visa_subclass:"600", label:"Bank statements (3 months)",                   is_required:true,  portal_upload:"client" },
      { visa_subclass:"600", label:"Evidence of employment (letter from employer)", is_required:true,  portal_upload:"client" },
      { visa_subclass:"600", label:"Evidence of ties to home country",              is_required:true,  portal_upload:"client" },
      { visa_subclass:"600", label:"Travel itinerary",                              is_required:false, portal_upload:"client" },
      { visa_subclass:"600", label:"Return flight bookings",                        is_required:false, portal_upload:"client" },
      { visa_subclass:"600", label:"Sponsor Form 1163 (Sponsored Family stream)",  is_required:false, portal_upload:null    },
      { visa_subclass:"600", label:"Health insurance evidence",                     is_required:false, portal_upload:"client" }
    );
  }

  if (all.length === 0) {
    console.log("  ✓ document_types: already seeded, skipping");
    return;
  }

  await ok(`document_types (${all.length} rows)`, sb.from("document_types").insert(all));
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding VisaDesk database…");

  await seedWorkflowTemplates();
  await seedCaseTemplates();
  await seedDocumentTypes();

  console.log("\n── Verification ──");
  const tables = [
    "workflow_templates","workflow_stages","workflow_tasks",
    "case_templates","case_template_sections","case_template_fields",
    "document_types",
  ];
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count:"exact", head:true });
    console.log(`  ✓ ${t}: ${count} rows`);
  }

  console.log("\nDone.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
