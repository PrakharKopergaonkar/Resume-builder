import { z } from "zod";

export const TEMPLATE_IDS = ["classic", "modern", "sidebar"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const FONT_IDS = ["source-sans", "lato", "georgia"] as const;
export type FontId = (typeof FONT_IDS)[number];

const id = z.string().min(1);
const text = z.string().max(20_000);

export const linkSchema = z.object({ id, label: text, url: text });

export const headerSchema = z.object({
  firstName: text,
  lastName: text,
  title: text,
  email: text,
  phone: text,
  city: text,
  country: text,
  links: z.array(linkSchema),
});

export const experienceItemSchema = z.object({
  id,
  title: text,
  company: text,
  city: text,
  country: text,
  start: text, // "YYYY-MM" or ""
  end: text, // "YYYY-MM" or ""
  current: z.boolean(),
  html: text,
});

export const educationItemSchema = z.object({
  id,
  school: text,
  degree: text,
  field: text,
  city: text,
  gradYear: text,
  html: text,
});

export const skillItemSchema = z.object({
  id,
  name: text,
  level: z.number().int().min(0).max(5), // 0 = not shown
});

export const customItemSchema = z.object({
  id,
  heading: text,
  date: text,
  html: text,
});

const month = z.number().int().min(0).max(12); // 0 = not set
const year = z.string().regex(/^(\d{4})?$/); // "" or "YYYY"

/** Name and issuer are required in the form, but stay plain strings here so half-filled entries can autosave. */
export const certificationItemSchema = z.object({
  id,
  name: text,
  issuer: text,
  issueMonth: month,
  issueYear: year,
  expiryMonth: month,
  expiryYear: year,
  credentialId: z.string().max(80),
  credentialUrl: text,
});

const sectionBase = {
  id,
  title: text,
  hidden: z.boolean(),
  column: z.union([z.literal(0), z.literal(1)]), // only used by two-column templates
};

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...sectionBase, type: z.literal("summary"), html: text }),
  z.object({ ...sectionBase, type: z.literal("experience"), items: z.array(experienceItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("education"), items: z.array(educationItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("skills"), items: z.array(skillItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("custom"), items: z.array(customItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("certifications"), items: z.array(certificationItemSchema) }),
]);

export const contentSchema = z.object({
  header: headerSchema,
  sections: z.array(sectionSchema),
});

export const styleSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font: z.enum(FONT_IDS),
  fontSize: z.enum(["S", "M", "L"]),
  sectionSpacing: z.number().min(0.5).max(2),
  lineHeight: z.number().min(1).max(2),
  paper: z.enum(["A4", "LETTER"]),
});

export const resumePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    templateId: z.enum(TEMPLATE_IDS),
    style: styleSchema,
    content: contentSchema,
  })
  .partial();

export type ResumeLink = z.infer<typeof linkSchema>;
export type ResumeHeader = z.infer<typeof headerSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type CustomItem = z.infer<typeof customItemSchema>;
export type CertificationItem = z.infer<typeof certificationItemSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section["type"];
export type ResumeContent = z.infer<typeof contentSchema>;
export type ResumeStyle = z.infer<typeof styleSchema>;
export type ResumePatch = z.infer<typeof resumePatchSchema>;

export type ResumeDoc = {
  id: string;
  name: string;
  templateId: TemplateId;
  style: ResumeStyle;
  content: ResumeContent;
  createdAt: string;
  updatedAt: string;
};

export type ResumeSummary = Pick<ResumeDoc, "id" | "name" | "templateId" | "createdAt" | "updatedAt">;
