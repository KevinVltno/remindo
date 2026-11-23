import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

export function createSupabase(cookies: CookieMethodsServer) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("Konfigurasi Supabase Remindo belum lengkap.");

  return createServerClient(url, key, {
    cookies,
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
  });
}

export async function getProfile(supabase: ReturnType<typeof createSupabase>) {
  const { data: auth } = await supabase.auth.getClaims();
  const id = auth?.claims?.sub;
  if (!id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Profil Remindo gagal dimuat.", { cause: error });
  return data;
}
