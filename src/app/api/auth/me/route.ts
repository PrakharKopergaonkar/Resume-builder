import { prisma } from "@/lib/db";
import { endSession, getCurrentUser, unauthorized } from "@/lib/auth/guard";

export async function GET() {
  const user = await getCurrentUser();
  return user ? Response.json(user) : unauthorized();
}

/** Deletes the signed-in account and, through the cascade, all of its resumes. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await prisma.user.delete({ where: { id: user.id } });
  await endSession();
  return new Response(null, { status: 204 });
}
