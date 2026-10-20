import { prisma } from "@/lib/db";
import { createResume } from "@/lib/resumes";

async function main() {
  if ((await prisma.resume.count()) > 0) {
    console.log("Database already has resumes; skipping seed.");
    return;
  }
  const r = await createResume({ name: "Sample Resume", sample: true });
  console.log(`Seeded "${r.name}" (${r.id})`);
}

main().finally(() => prisma.$disconnect());
