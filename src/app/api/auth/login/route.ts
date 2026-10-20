import { handle } from "@/lib/api/handle";
import { publicRoute } from "@/lib/api/middleware";
import { startSession } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db";

// Compared against when the email is unknown, so a miss takes as long as a wrong password.
const dummyHash = hashPassword("not-a-real-password");

/** Checks email and password and starts a session. */
async function loginHandler(req: Request) {
  const body = loginSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Email and password are required", issues: body.error.issues }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  const ok = await verifyPassword(body.data.password, user?.passwordHash ?? (await dummyHash));
  // Same answer for "no such email" and "wrong password": don't reveal which emails have accounts.
  if (!user || !ok) return Response.json({ error: "Email or password is incorrect" }, { status: 401 });

  await startSession(user.id);
  return Response.json({ id: user.id, name: user.name, email: user.email });
}

export const POST = handle(publicRoute, loginHandler);
