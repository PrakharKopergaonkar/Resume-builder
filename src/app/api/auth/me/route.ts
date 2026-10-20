import { handle } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { endSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

/** Returns the signed-in user's id, name and email. */
async function currentUserHandler(_req: Request, { user }: UserContext) {
  return Response.json(user);
}

/** Deletes the signed-in account and, through the cascade, all of its resumes. */
async function deleteAccountHandler(_req: Request, { user }: UserContext) {
  await prisma.user.delete({ where: { id: user.id } });
  await endSession();
  return new Response(null, { status: 204 });
}

export const GET = handle(withUser, currentUserHandler);
export const DELETE = handle(withUser, deleteAccountHandler);
