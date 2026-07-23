/**
 * @deprecated
 * Use `@/lib/supabase/client` in Client Components and browser workflows.
 * Use `@/lib/supabase/server` in Server Components, Route Handlers,
 * Server Actions, and repositories.
 *
 * Do not add new consumers.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);