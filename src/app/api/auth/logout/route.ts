import { endSession } from "@/lib/auth/guard";

export async function POST() {
  await endSession();
  return new Response(null, { status: 204 });
}
