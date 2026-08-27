type ProcurementActivityKind =
  | "rfq_created"
  | "quote_submitted"
  | "rfq_invitation_sent"
  | "rfi_submitted"
  | "rfi_responded"
  | "addendum_published"
  | "addendum_acknowledged";

type ProcurementActivityClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
};

type ActivityWriteContext = {
  userId: string;
  companyId: string;
};

type ActivityRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
};

function describeClientWriteError(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; message?: unknown };

    return {
      code: typeof record.code === "string" ? record.code : null,
      message: typeof record.message === "string" ? record.message : "unknown",
    };
  }

  return {
    code: null,
    message: "unknown",
  };
}

export async function recordTrustedProcurementActivity(
  supabase: ProcurementActivityClient,
  activityKind: ProcurementActivityKind,
  entityId: string,
  context: ActivityWriteContext,
) {
  try {
    const { data, error } = await supabase.rpc("record_procurement_activity", {
      p_activity_kind: activityKind,
      p_entity_id: entityId,
    });

    if (error) {
      console.error("Procurement activity was not recorded.", {
        userId: context.userId,
        companyId: context.companyId,
        entityId,
        activityKind,
        error: describeClientWriteError(error),
      });
      return;
    }

    const result = (data ?? {}) as ActivityRpcResult;

    if (result.success === true) {
      return;
    }

    console.error("Procurement activity was not recorded.", {
      userId: context.userId,
      companyId: context.companyId,
      entityId,
      activityKind,
      error: {
        code: result.error_code ?? null,
        message: result.error_message ?? "unknown",
      },
    });
  } catch (failure) {
    console.error("Procurement activity was not recorded.", {
      userId: context.userId,
      companyId: context.companyId,
      entityId,
      activityKind,
      error: describeClientWriteError(failure),
    });
  }
}
