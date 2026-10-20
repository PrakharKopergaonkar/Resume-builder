import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/** Resolves DATABASE_URL ("file:./data/resumes.db") relative to the project root. */
function databaseUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./data/resumes.db";
  const file = raw.replace(/^file:/, "");
  return `file:${path.resolve(/* turbopackIgnore: true */ process.cwd(), file)}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
