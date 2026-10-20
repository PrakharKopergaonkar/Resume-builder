import { jwtVerify, SignJWT } from "jose";

/**
 * Session = a signed JWT (HS256) in an httpOnly cookie. The payload carries only the user id (`sub`).
 * Kept free of `server-only`/next/headers so the proxy can use it too.
 */

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or too short. Run `npm run setup` to generate one in .env.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secretKey());
}

/** Returns the user id for a valid, unexpired token, otherwise null (tampered, expired, wrong secret, garbage). */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const key = secretKey(); // misconfiguration should surface as an error, not as "logged out"
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Browsers treat http://localhost as secure, so Secure cookies also work for a local production build.
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
