import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSessionKey } from "@/lib/session-key";

function toLogin(request: NextRequest) {
  const url = new URL("/admin/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next !== "/admin") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except login)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Allow admin API routes to handle their own auth
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;
  const encodedKey = getSessionKey();

  if (!session || !encodedKey) {
    return toLogin(request);
  }

  try {
    await jwtVerify(session, encodedKey, { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    return toLogin(request);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
