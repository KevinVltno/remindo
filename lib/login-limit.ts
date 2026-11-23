import { createHmac, randomUUID } from "node:crypto";
import { serviceDb } from "./supabase-service";

export function loginAttempt(email: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Konfigurasi pembatas login belum lengkap.");

  const accountKey = createHmac("sha256", secret).update(email.toLowerCase()).digest("hex");
  const db = serviceDb();
  const params = { p_account_key: accountKey, p_attempt_id: randomUUID() };

  return {
    async reserve() {
      const { data, error } = await db.rpc("remindo_reserve_login", params);
      if (error) throw error;
      if (typeof data?.allowed !== "boolean") throw new Error("Respons pembatas login tidak valid.");
      return { allowed: data.allowed as boolean, lockedUntil: typeof data.locked_until === "string" ? data.locked_until : null };
    },
    async finish(success: boolean) {
      const { error } = await db.rpc("remindo_finish_login", { ...params, p_success: success });
      if (error) throw error;
    },
  };
}
