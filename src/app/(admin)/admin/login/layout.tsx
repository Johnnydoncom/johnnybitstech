import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Login | Johnnybits" };

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // Login page has its own full-screen layout (no sidebar)
  return <>{children}</>;
}
