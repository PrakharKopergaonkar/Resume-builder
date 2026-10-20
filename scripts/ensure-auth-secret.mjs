// Makes sure .env has an AUTH_SECRET (used to sign session JWTs). Generates a random one if missing;
// never overwrites an existing value. Run by `npm run setup`.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";

const file = ".env";
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
if (/^AUTH_SECRET=.+$/m.test(current)) {
  console.log("AUTH_SECRET already set in .env");
} else {
  const line = `AUTH_SECRET="${randomBytes(32).toString("base64url")}"\n`;
  if (current && !current.endsWith("\n")) appendFileSync(file, "\n");
  if (current) appendFileSync(file, line);
  else writeFileSync(file, line);
  console.log("Generated AUTH_SECRET in .env");
}
