import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

// Service-role client. Bypasses RLS, can call `auth.admin.*` methods.
// NEVER import this in any file that can be sent to the browser.
// The `server-only` import above will cause a build error if it leaks.
export function createSupabaseAdminClient() {
    return createClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        },
    );
}
