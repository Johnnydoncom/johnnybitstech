const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log("Adding featured_image column...");
    await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS featured_image VARCHAR(255)`;
    console.log("Column added successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
