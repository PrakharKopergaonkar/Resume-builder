import path from "node:path";
import Database from "better-sqlite3";
import { request, type FullConfig } from "@playwright/test";
import { STORAGE_STATE } from "./auth-helpers";

/**
 * Removes the shared test user, then sweeps any other test accounts (all use the reserved @test.local domain)
 * that a failed test may have left behind before reaching its own cleanup.
 */
export default async function globalTeardown(config: FullConfig) {
  const api = await request.newContext({ baseURL: config.projects[0].use.baseURL, storageState: STORAGE_STATE });
  await api.delete("/api/auth/me");
  await api.dispose();

  try {
    process.loadEnvFile();
  } catch {
    // no .env: use the default database path
  }
  const file = (process.env.DATABASE_URL ?? "file:./data/resumes.db").replace(/^file:/, "");
  const db = new Database(path.resolve(file));
  db.pragma("foreign_keys = ON"); // so deleting a user cascades to their resumes
  const { changes } = db.prepare("DELETE FROM User WHERE email LIKE '%@test.local'").run();
  db.close();
  if (changes) console.log(`teardown: removed ${changes} leftover test account(s)`);
}
