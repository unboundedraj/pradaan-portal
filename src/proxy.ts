import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/types/database";

const ROLE_HOME: Record<string, string> = {
  DONOR: "/donor",
  ORGANIZATION: "/org",
  ADMIN: "/admin",
};

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Step 1: write cookies back onto the request so downstream Server
          // Components see the refreshed token within the same cycle.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Step 2: create a fresh response and write cookies onto it so they
          // are persisted to the browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — primary purpose of the proxy layer.
  // getUser() validates the JWT with Supabase Auth on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Unauthenticated user trying to access a protected area ─────────────────
  const isProtected =
    pathname.startsWith("/donor") ||
    pathname.startsWith("/org") ||
    pathname.startsWith("/admin");

  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated user — enforce role-based route access ───────────────────
  if (user && isProtected) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (data as { role: UserRole } | null)?.role;

    if (role) {
      const allowedPrefix = ROLE_HOME[role];
      if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
        return NextResponse.redirect(new URL(allowedPrefix, request.url));
      }
    }
  }

  // ── Authenticated user hitting login/signup — redirect to their dashboard ──
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (user && isAuthRoute) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (data as { role: UserRole } | null)?.role;
    const home = role ? ROLE_HOME[role] : "/";
    return NextResponse.redirect(new URL(home ?? "/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
