import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";

export type CurrentUser = { id: string; name: string; email: string };

/** The signed-in user, or null when there is no valid session (or the account no longer exists). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), sessionCookieOptions);
}

export async function endSession() {
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}
