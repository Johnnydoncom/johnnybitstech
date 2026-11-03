/**
 * Usage (loads .env.local, then .env):
 *   npm run db:status
 *   npm run db:migrate
 *   npm run db:rollback            # reverts the latest migration
 *   npm run db:rollback -- 2       # reverts the latest two
 */
import { config } from "dotenv";
import { migrateDown, migrateUp, migrationStatus } from "../../db/migrator";
import { createNeonExecutor } from "./neon-executor";

config({ path: ".env.local" });
config();

async function main() {
  const [command = "status", arg] = process.argv.slice(2);
  const db = createNeonExecutor();
  try {
    if (command === "up") {
      const ran = await migrateUp(db);
      console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Nothing to apply.");
    } else if (command === "down") {
      const steps = Number.parseInt(arg ?? "1", 10);
      if (!Number.isInteger(steps) || steps < 1) throw new Error("Steps must be a positive integer");
      const reverted = await migrateDown(db, steps);
      console.log(reverted.length ? `Reverted: ${reverted.join(", ")}` : "Nothing to revert.");
    } else if (command === "status") {
      for (const m of await migrationStatus(db)) {
        console.log(`${m.appliedAt ? "applied" : "pending"}  ${m.version}_${m.name}${m.appliedAt ? `  (${m.appliedAt.toISOString()})` : ""}`);
      }
    } else {
      throw new Error(`Unknown command "${command}". Use status | up | down [steps].`);
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
