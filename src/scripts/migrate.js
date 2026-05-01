// Database migration script for Johnnybits admin (Neon PostgreSQL)
// Run: node src/scripts/migrate.js

const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Connected to Neon PostgreSQL. Running migrations...");

  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT,
      tag VARCHAR(100),
      published BOOLEAN DEFAULT FALSE,
      meta_title VARCHAR(255),
      meta_description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published)`;
  console.log("✓ blog_posts table created");

  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(active)`;
  console.log("✓ newsletter_subscribers table created");

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      logo_url VARCHAR(512),
      website VARCHAR(512),
      display_order INT DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active)`;
  console.log("✓ clients table created");

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("✓ admin_users table created");

  console.log("\nAll migrations complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
