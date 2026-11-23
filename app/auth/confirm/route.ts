import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  let destination = "/login?status=confirmation-error";
  if (type === "email" && tokenHash && tokenHash.length <= 256) {
    const supabase = await supabaseServer(true);
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (!error) destination = "/dashboard";
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
