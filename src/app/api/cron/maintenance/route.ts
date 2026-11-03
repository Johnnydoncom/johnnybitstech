import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { isAuthorizedCronRequest, runMaintenance } from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daily retention job (see vercel.json). Vercel Cron calls this with the CRON_SECRET bearer token. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const deleted = await runMaintenance(getDb());
    return NextResponse.json({ ok: true, deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("maintenance failed", error);
    return NextResponse.json({ ok: false, error: "maintenance failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
