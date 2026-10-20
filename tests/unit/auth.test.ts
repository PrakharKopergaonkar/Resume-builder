import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession, verifySession } from "@/lib/auth/session";
import { safeNext } from "@/components/auth/AuthForm";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
});

describe("passwords", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips the user id", async () => {
    expect(await verifySession(await signSession("user-123"))).toBe("user-123");
  });

  it("rejects missing, garbage and tampered tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("not.a.jwt")).toBeNull();
    const token = await signSession("user-123");
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "someone-else", exp: 9999999999 })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`)).toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const other = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("user-123").setExpirationTime("1h").sign(new TextEncoder().encode("a-completely-different-secret-value-123"));
    expect(await verifySession(other)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    expect(await verifySession(await signSession("user-123", -10))).toBeNull();
  });

  it("refuses to work without a proper secret", async () => {
    const saved = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "short";
    await expect(signSession("user-123")).rejects.toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = saved;
  });
});

describe("post-login redirect", () => {
  it("only allows in-app paths", () => {
    expect(safeNext("/resume/abc")).toBe("/resume/abc");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/login")).toBe("/");
  });
});
