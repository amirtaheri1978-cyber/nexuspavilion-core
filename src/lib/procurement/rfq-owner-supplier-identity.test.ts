import { describe, expect, it } from "vitest";

import {
  buildRfqOwnerSupplierNameById,
  resolveRfqOwnerSupplierLabel,
} from "@/lib/procurement/rfq-owner-supplier-identity";

describe("RFQ-13 owner supplier identity", () => {
  it("uses the canonical company_directory name when present", () => {
    const supplierNameById = buildRfqOwnerSupplierNameById([
      {
        id: "company-1",
        name: "  Harbor Steel Co. North American Refrigeration Division  ",
      },
      { id: "company-2", name: null },
      { id: "company-3", name: "   " },
    ]);

    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: "company-1",
        rank: 1,
        supplierNameById,
      }),
    ).toBe("Harbor Steel Co. North American Refrigeration Division");
  });

  it("does not invent a supplier name from rank, user ids, or blank directory rows", () => {
    const supplierNameById = buildRfqOwnerSupplierNameById([
      { id: "company-2", name: null },
      { id: "company-3", name: "   " },
    ]);

    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: "company-2",
        rank: 2,
        supplierNameById,
      }),
    ).toBe("Supplier quote #2");
    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: "company-3",
        rank: 3,
        supplierNameById,
      }),
    ).toBe("Supplier quote #3");
    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: null,
        rank: 4,
        supplierNameById,
      }),
    ).toBe("Supplier quote #4");
    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: "user-1",
        rank: 1,
        supplierNameById,
      }),
    ).toBe("Supplier quote #1");

    expect(supplierNameById.has("company-2")).toBe(false);
    expect(supplierNameById.has("company-3")).toBe(false);
    expect([...supplierNameById.values()].join(" ")).not.toContain(
      "Unverified Supplier",
    );
    expect([...supplierNameById.values()].join(" ")).not.toContain(
      "Named supplier",
    );
  });
});
