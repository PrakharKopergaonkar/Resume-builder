import "server-only";
import { cookies } from "next/headers";
import { endSession, getCurrentUser, type CurrentUser } from "@/lib/auth/guard";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { unauthorized, type HandlerContext, type Middleware } from "./handle";

/**
 * Middlewares for `handle()`. Every route passes exactly one, explicitly, so the auth decision is visible on the
 * export line (see AGENTS.md).
 */

/** Requires a signed-in user whose account still exists; otherwise answers 401. */
export const withUser: Middleware<{ user: CurrentUser; sessionToken: string }> = async () => {
  const user = await getCurrentUser();
  if (!user) {
    // A leftover cookie (account deleted, or a bad token) would keep the page proxy treating the browser as signed
    // in and bouncing /login back to /, so drop it along with the 401.
    if ((await cookies()).has(SESSION_COOKIE)) await endSession();
    return unauthorized();
  }
  // The token is the user's own session; the PDF/thumbnail renderer forwards it to the print page.
  const sessionToken = (await cookies()).get(SESSION_COOKIE)!.value;
  return { user, sessionToken };
};

/** For endpoints that must work signed out (sign-up, log-in, log-out). Adds nothing to the context. */
export const publicRoute: Middleware<Record<string, never>> = async () => ({});

/** Context of a handler behind `withUser`: `{ user, sessionToken, params }`. */
export type UserContext = HandlerContext<{ user: CurrentUser; sessionToken: string }>;

/** Context of a handler behind `publicRoute`: `{ params }`. */
export type PublicContext = HandlerContext<Record<string, never>>;
