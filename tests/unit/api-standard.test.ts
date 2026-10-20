import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Enforces the "API route standard" in AGENTS.md on every src/app/api/** /route.ts. */
const API_DIR = path.resolve(import.meta.dirname, "../../src/app/api");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const files = routeFiles(API_DIR);
const rel = (f: string) => path.relative(path.resolve(import.meta.dirname, "../.."), f);

describe("API route standard (AGENTS.md)", () => {
  it("finds the route files", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const exported = METHODS.filter((m) => new RegExp(`export\\s+(async\\s+function|const|function)\\s+${m}\\b`).test(src));

    it(`${rel(file)}: every method is handle(withUser | publicRoute, namedHandler) with the handler in this file`, () => {
      expect(exported.length).toBeGreaterThan(0);
      for (const m of exported) {
        const match = src.match(new RegExp(`export const ${m} = handle\\((withUser|publicRoute), (\\w+)\\);`));
        expect(match, `${m} must be "export const ${m} = handle(withUser | publicRoute, someHandler);"`).not.toBeNull();
        const name = match![2];
        expect(src, `${name} must be defined in ${rel(file)}`).toMatch(new RegExp(`(async\\s+)?function\\s+${name}\\s*\\(`));
      }
    });

    it(`${rel(file)}: no session checks inside the route`, () => {
      expect(src).not.toMatch(/getCurrentUser\(|verifySession\(|from "next\/headers"/);
    });
  }
});
