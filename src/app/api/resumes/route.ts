import { z } from "zod";
import { createResume, listResumes } from "@/lib/resumes";

export async function GET() {
  return Response.json(await listResumes());
}

const createSchema = z.object({ name: z.string().max(200).optional(), sample: z.boolean().optional() });

export async function POST(req: Request) {
  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  return Response.json(await createResume(body.data), { status: 201 });
}
