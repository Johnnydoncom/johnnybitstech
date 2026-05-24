// Script to seed a default admin user into the database (Neon PostgreSQL)
// Run: node src/scripts/seed-admin.js

const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

async function seedAdmin() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Connected to Neon PostgreSQL. Seeding default admin user...");

  try {
    // 1. Check if admin_users table exists
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'admin_users'
    `;
    if (tables.length === 0) {
      console.error("❌ The 'admin_users' table does not exist. Please run 'node src/scripts/migrate.js' first.");
      process.exit(1);
    }

    // 2. Check if an admin user already exists
    const existingAdmin = await sql`SELECT COUNT(*) as count FROM admin_users`;
    if (Number(existingAdmin[0].count) > 0) {
      console.log("⚠ An admin user already exists in the database. No seeding necessary.");
      process.exit(0);
    }

    // 3. Define default admin credentials
    const defaultEmail = process.env.ADMIN_EMAIL || "admin@johnnybits.com";
    const plainTextPassword = "password123"; // Default temporary password

    // 4. Hash the password
    console.log(`Generating bcrypt hash for default password...`);
    const passwordHash = await bcrypt.hash(plainTextPassword, 10);

    // 5. Insert into database
    await sql`INSERT INTO admin_users (email, password_hash) VALUES (${defaultEmail}, ${passwordHash})`;

    console.log("\n✅ Default admin user successfully seeded!");
    console.log("-------------------------------------------------");
    console.log(`Email:    ${defaultEmail}`);
    console.log(`Password: ${plainTextPassword}`);
    console.log("-------------------------------------------------");
    console.log("Please log in and change your password immediately from the /admin/profile page.");

  } catch (error) {
    console.error("❌ Failed to seed admin user:", error.message);
  }
}

seedAdmin().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
