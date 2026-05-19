// ─── Permission matrix ──────────────────────────────────────────────────────────
//
// Each role maps to a set of resources and their access level:
//   "full"  – read + write
//   "view"  – read only
//   "none"  – no access

export type AccessLevel = "full" | "view" | "none";
export type Resource =
  | "cases"
  | "clients"
  | "trust"
  | "workflow"
  | "documents"
  | "comms"
  | "settings"
  | "team"
  | "pipeline";

type PermMatrix = Record<string, Record<Resource, AccessLevel>>;

export const PERMISSIONS: PermMatrix = {
  firm_admin: {
    cases:     "full",
    clients:   "full",
    trust:     "full",
    workflow:  "full",
    documents: "full",
    comms:     "full",
    settings:  "full",
    team:      "full",
    pipeline:  "full",
  },
  agent: {
    cases:     "full",
    clients:   "full",
    trust:     "view",
    workflow:  "full",
    documents: "full",
    comms:     "full",
    settings:  "none",
    team:      "none",
    pipeline:  "full",
  },
  finance: {
    cases:     "view",
    clients:   "view",
    trust:     "full",
    workflow:  "none",
    documents: "none",
    comms:     "view",
    settings:  "none",
    team:      "none",
    pipeline:  "none",
  },
  staff: {
    cases:     "view",
    clients:   "view",
    trust:     "none",
    workflow:  "none",
    documents: "none",
    comms:     "full",
    settings:  "none",
    team:      "none",
    pipeline:  "none",
  },
};

/**
 * Returns true if `role` has at least the given `requiredLevel` on `resource`.
 * "full" satisfies both "full" and "view". "view" satisfies only "view".
 */
export function canAccess(
  role: string,
  resource: Resource,
  requiredLevel: "view" | "full"
): boolean {
  const matrix = PERMISSIONS[role] ?? PERMISSIONS.agent;
  const actual = matrix[resource] ?? "none";
  if (actual === "none") return false;
  if (requiredLevel === "view") return actual === "view" || actual === "full";
  return actual === "full";
}
