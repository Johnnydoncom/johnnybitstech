import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

const SETTINGS_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_from_email",
  "smtp_from_name",
  "smtp_to_email"
];

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
    const settingsObj = rows.reduce((acc: Record<string, string>, row: any) => {
      acc[row.setting_key] = row.setting_value || "";
      return acc;
    }, {});

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Process each key we care about
    for (const key of SETTINGS_KEYS) {
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
