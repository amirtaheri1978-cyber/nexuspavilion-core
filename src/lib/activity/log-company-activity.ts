import type { SupabaseClient } from "@supabase/supabase-js";

type LogCompanyActivityInput = {
supabase: SupabaseClient;
companyId: string;
actorId?: string | null;
action: string;
entityType: string;
entityId?: string | null;
metadata?: Record<string, unknown>;
};

export async function logCompanyActivity({
supabase,
companyId,
actorId = null,
action,
entityType,
entityId = null,
metadata = {},
}: LogCompanyActivityInput) {
if (!companyId || !action || !entityType) {
return {
success: false,
error: "Missing required company activity fields.",
};
}

const { error } = await supabase.from("company_activity_logs").insert({
company_id: companyId,
actor_id: actorId,
action,
entity_type: entityType,
entity_id: entityId,
metadata,
created_at: new Date().toISOString(),
});

if (error) {
console.error("Company activity log error:", error);

return {
success: false,
error: error.message,
};
}

return {
success: true,
error: null,
};
}