import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { adminEmails } from "@/lib/env";

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
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    if (!user) {
        if (!pathname.startsWith("/login")) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        return supabaseResponse;
    }

    // Redirect logged-in users away from the login page
    if (pathname.startsWith("/login")) {
        const role = user.user_metadata?.role as string | undefined;
        const isAdmin = adminEmails().includes((user.email ?? "").trim().toLowerCase());
        const dest = role === "worker" ? "/worker/new-bill" : isAdmin ? "/admin" : "/";
        return NextResponse.redirect(new URL(dest, request.url));
    }

    const role = user.user_metadata?.role as string | undefined;
    if (role === "worker") {
        // Workers may only access the bill creation page and print pages
        const allowed =
            pathname.startsWith("/worker") || pathname.startsWith("/print");
        if (!allowed) {
            return NextResponse.redirect(
                new URL("/worker/new-bill", request.url),
            );
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
