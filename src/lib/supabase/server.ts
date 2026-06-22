import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client bound to the current request's cookies.
 * Use inside Server Components, Server Actions, and Route Handlers.
 *
 * Must be called inside an async context (it awaits the cookies store).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies cannot be set here.
            // Middleware handles session refresh so this is safe to ignore.
          }
        },
      },
    }
  );
}

/**
 * Service-role client — bypasses Row-Level Security.
 * ONLY use in trusted server contexts (webhooks, admin ops, Server Actions).
 * NEVER instantiate this in client-side code.
 *
 * Uses the bare @supabase/supabase-js createClient intentionally — NOT the
 * cookie-aware @supabase/ssr createServerClient. The SSR variant swaps the
 * Authorization header to the user's session JWT when cookies are present,
 * which causes RLS to fire even with the service role key. The bare client
 * always sends the service role JWT, guaranteeing RLS bypass.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
