export type RfqOwnerSupplierCompanyIdentity = {
  id: string;
  name: string | null;
};

export function buildRfqOwnerSupplierNameById(
  supplierCompanies?: ReadonlyArray<RfqOwnerSupplierCompanyIdentity> | null,
): Map<string, string> {
  const names = new Map<string, string>();

  for (const company of supplierCompanies ?? []) {
    const name = company.name?.trim();
    if (!name) {
      continue;
    }

    names.set(company.id, name);
  }

  return names;
}

export function resolveRfqOwnerSupplierLabel({
  companyId,
  rank,
  supplierNameById,
}: {
  companyId: string | null | undefined;
  rank: number;
  supplierNameById: ReadonlyMap<string, string>;
}): string {
  if (companyId) {
    const name = supplierNameById.get(companyId);
    if (name) {
      return name;
    }
  }

  return `Supplier quote #${rank}`;
}
