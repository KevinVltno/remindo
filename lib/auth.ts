import { cookies } from "next/headers";
import { connection } from "next/server";
import { createSupabase } from "./supabase";

export async function supabaseServer(writable = false) {
  if (!writable) await connection();
  const store = await cookies();
  return createSupabase({
    getAll: () => store.getAll(),
    setAll: (values) => {
      if (writable) {
        for (const { name, value, options } of values) store.set(name, value, options);
      }
    },
  });
}
