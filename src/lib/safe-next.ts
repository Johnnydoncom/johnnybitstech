/** Only same-site admin paths may be used as a post-login destination (prevents open redirects). */
export function safeAdminNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return "/admin";
  if (value === "/admin/login" || value.startsWith("/admin/login?") || value.startsWith("/admin/login/")) return "/admin";
  try {
    const url = new URL(value, "https://placeholder.invalid");
    return url.origin === "https://placeholder.invalid" ? `${url.pathname}${url.search}` : "/admin";
  } catch {
    return "/admin";
  }
}
