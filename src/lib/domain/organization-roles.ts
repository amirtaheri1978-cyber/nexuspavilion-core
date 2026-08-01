import type {
  WorkspaceRole,
} from "@/lib/auth/membership";

export type LegacyProfileRole =
  | "owner"
  | "admin"
  | "buyer"
  | "vendor"
  | null
  | undefined;

export type ProcurementFunction =
  | "buyer"
  | "supplier"
  | "consultant"
  | "none";

export type OrganizationRoleModel = {
  workspaceRole: WorkspaceRole;
  procurementFunction: ProcurementFunction;
};

export function mapLegacyRoleToOrganizationRole(
  legacyRole: LegacyProfileRole,
): OrganizationRoleModel {
  const normalizedRole = String(legacyRole || "")
    .trim()
    .toLowerCase();

  switch (normalizedRole) {
    case "owner":
      return {
        workspaceRole: "owner",
        procurementFunction: "none",
      };

    case "admin":
      return {
        workspaceRole: "admin",
        procurementFunction: "none",
      };

    case "buyer":
      return {
        workspaceRole: "member",
        procurementFunction: "buyer",
      };

    case "vendor":
      return {
        workspaceRole: "member",
        procurementFunction: "supplier",
      };

    default:
      return {
        workspaceRole: "viewer",
        procurementFunction: "none",
      };
  }
}

export function isLegacyWorkspaceAdministrator(
  legacyRole: LegacyProfileRole,
) {
  const { workspaceRole } =
    mapLegacyRoleToOrganizationRole(legacyRole);

  return (
    workspaceRole === "owner" ||
    workspaceRole === "admin"
  );
}

export function hasBuyerProcurementFunction(
  legacyRole: LegacyProfileRole,
) {
  return (
    mapLegacyRoleToOrganizationRole(legacyRole)
      .procurementFunction === "buyer"
  );
}

export function hasSupplierProcurementFunction(
  legacyRole: LegacyProfileRole,
) {
  return (
    mapLegacyRoleToOrganizationRole(legacyRole)
      .procurementFunction === "supplier"
  );
}