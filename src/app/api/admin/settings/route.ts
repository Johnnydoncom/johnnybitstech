import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security/same-origin";

const SETTINGS_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_from_email",
  "smtp_from_name",
  "smtp_to_email"
];

/** Secret settings are write-only: GET reports whether one is saved, never its value. */
const SECRET_KEYS = new Set(["smtp_pass"]);

// Helper to check admin session
async function isAdmin() {
  const session = await verifySession();
  return session !== null;
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await query("SELECT setting_key, setting_value FROM settings");
    
    // Convert array of {key, value} to an object
    const settingsObj = (rows as { setting_key: string; setting_value: string | null }[]).reduce((acc: Record<string, string | boolean>, row) => {
      if (SECRET_KEYS.has(row.setting_key)) acc[`${row.setting_key}_set`] = Boolean(row.setting_value);
      else acc[row.setting_key] = row.setting_value || "";
      return acc;
    }, {});

    return NextResponse.json(settingsObj, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Process each key we care about
    for (const key of SETTINGS_KEYS) {
      // An empty secret means "keep the saved one" (the form never receives it back).
      if (SECRET_KEYS.has(key) && !body[key]) continue;
      if (body[key] !== undefined) {
        // Upsert logic (Neon PostgreSQL)
        await execute(
          `INSERT INTO settings (setting_key, setting_value, updated_at) 
           VALUES (?, ?, NOW()) 
           ON CONFLICT (setting_key) 
           DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [key, body[key]]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
