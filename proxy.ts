import { NextResponse, type NextRequest } from "next/server";
import { createSupabase, getProfile } from "@/lib/supabase";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const cacheHeaders = new Headers();

  const supabase = createSupabase({
    getAll: () => request.cookies.getAll(),
    setAll: (values, headers) => {
      const previousCookies = response.cookies.getAll();
      for (const { name, value } of values) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const cookie of previousCookies) response.cookies.set(cookie);
      for (const { name, value, options } of values) response.cookies.set(name, value, options);
      for (const [name, value] of Object.entries(headers)) cacheHeaders.set(name, value);
    },
  });

  const profile = await getProfile(supabase);
  const pathname = request.nextUrl.pathname;
  let destination: string | undefined;
  if (!profile) destination = "/login";
  else if (!profile.is_active) destination = "/login?status=inactive";
  else if ((pathname === "/admin" || pathname.startsWith("/admin/")) && profile.role !== "admin") {
    destination = "/dashboard";
  }

  if (destination) {
    const redirect = NextResponse.redirect(new URL(destination, request.url), 303);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    response = redirect;
  }

  cacheHeaders.forEach((value, name) => response.headers.set(name, value));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
