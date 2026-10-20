import { handle } from "@/lib/api/handle";
import { publicRoute } from "@/lib/api/middleware";
import { endSession } from "@/lib/auth/guard";

/** Clears the session cookie. */
async function logoutHandler() {
  await endSession();
  return new Response(null, { status: 204 });
}

export const POST = handle(publicRoute, logoutHandler);
