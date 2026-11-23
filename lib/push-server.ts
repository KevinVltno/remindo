export function pushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      (["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname) ||
        url.hostname.endsWith(".push.apple.com") || url.hostname.endsWith(".notify.windows.com"));
  } catch {
    return false;
  }
}
