import { handle } from "@/lib/api/handle";
import { publicRoute } from "@/lib/api/middleware";
import { startSession } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { signupSchema } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db";
import { DEFAULT_STYLE, STARTER_RESUME_NAME, starterContent } from "@/lib/defaults";
import { Prisma } from "@/generated/prisma/client";

/** Creates the account and its starter "Sample Resume" in one transaction, then signs the user in. */
async function signupHandler(req: Request) {
  const body = signupSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid sign-up details", issues: body.error.issues }, { status: 400 });
  const { name, email, password } = body.data;

  const passwordHash = await hashPassword(password);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash } });
      await tx.resume.create({
        data: { userId: user.id, name: STARTER_RESUME_NAME, templateId: "classic", style: DEFAULT_STYLE, content: starterContent(user) },
      });
      return user;
    });
    await startSession(user.id);
    return Response.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return Response.json({ error: "An account with this email already exists", code: "email_taken" }, { status: 409 });
    }
    throw e; // anything else: handle() logs it and answers 500
  }
}

export const POST = handle(publicRoute, signupHandler);
