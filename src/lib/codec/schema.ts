import { z } from "zod";
import { FONT_IDS, TEMPLATE_IDS } from "@/types/resume";

/**
 * The shape of the resume as YAML in the Code view: friendlier than the stored model (no ids, "left"/"right"
 * columns, markdown rich text). `src/lib/codec/yaml.ts` maps it onto the stored model.
 */

/** Any scalar becomes a string (YAML reads `2020` as a number); missing becomes "". */
const text = z.preprocess((v) => (v == null ? "" : typeof v === "number" || typeof v === "boolean" ? String(v) : v), z.string().max(20_000));
const month = z.preprocess(
  (v) => (v == null ? "" : String(v)),
  z.string().regex(/^(\d{4}-(0[1-9]|1[0-2]))?$/, { error: "expected a month like 2023-07 (or leave empty)" }),
);
const year = z.preprocess((v) => (v == null ? "" : String(v)), z.string().regex(/^(\d{4})?$/, { error: "expected a year like 2024 (or leave empty)" }));
const monthNumber = z.preprocess((v) => (v == null || v === "" ? 0 : v), z.number({ error: "expected a month number 1–12 (or 0)" }).int().min(0).max(12));
const flag = z.boolean({ error: "expected true or false" }).optional().default(false);
const column = z.enum(["left", "right"], { error: "expected left or right" }).optional();

const base = { title: text, hidden: flag, column };

const experienceItem = z.object({
  title: text,
  company: text,
  city: text,
  country: text,
  start: month,
  end: month,
  current: flag,
  description: text,
});

const educationItem = z.object({ school: text, degree: text, field: text, city: text, gradYear: text, details: text });

/** A skill is either a plain name or `{ name, level }` (level 0–5, 0 = not shown). */
const skillItem = z.union(
  [
    z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string()),
    z.object({ name: text, level: z.number({ error: "expected a level 0–5" }).int().min(0).max(5).optional().default(0) }),
  ],
  { error: "expected a skill name, or { name, level }" },
);

const customItem = z.object({ heading: text, date: text, description: text });

const certificationItem = z.object({
  name: text,
  issuer: text,
  issueMonth: monthNumber,
  issueYear: year,
  expiryMonth: monthNumber,
  expiryYear: year,
  credentialId: z.preprocess((v) => (v == null ? "" : String(v)), z.string().max(80, { error: "at most 80 characters" })),
  credentialUrl: text,
});

const SECTION_TYPES = ["summary", "experience", "education", "skills", "certifications", "custom"] as const;

export const yamlSectionSchema = z.discriminatedUnion(
  "type",
  [
    z.object({ ...base, type: z.literal("summary"), text }),
    z.object({ ...base, type: z.literal("experience"), items: z.array(experienceItem).optional().default([]) }),
    z.object({ ...base, type: z.literal("education"), items: z.array(educationItem).optional().default([]) }),
    z.object({ ...base, type: z.literal("skills"), items: z.array(skillItem).optional().default([]) }),
    z.object({ ...base, type: z.literal("certifications"), items: z.array(certificationItem).optional().default([]) }),
    z.object({ ...base, type: z.literal("custom"), items: z.array(customItem).optional().default([]) }),
  ],
  { error: `unknown section type (use one of: ${SECTION_TYPES.join(", ")})` },
);

export const yamlDocSchema = z.object({
  name: z.preprocess((v) => (v == null ? "" : String(v)), z.string().trim().min(1, { error: "the resume needs a name" }).max(200)),
  design: z
    .object({
      template: z.enum(TEMPLATE_IDS, { error: `expected one of: ${TEMPLATE_IDS.join(", ")}` }),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'expected a color like "#2f5d8a" (in quotes)' }),
      font: z.enum(FONT_IDS, { error: `expected one of: ${FONT_IDS.join(", ")}` }),
      fontSize: z.enum(["S", "M", "L"], { error: "expected S, M or L" }),
      sectionSpacing: z.number({ error: "expected a number between 0.5 and 2" }).min(0.5).max(2),
      lineHeight: z.number({ error: "expected a number between 1 and 2" }).min(1).max(2),
      paper: z.enum(["A4", "LETTER"], { error: "expected A4 or LETTER" }),
    })
    .partial()
    .optional()
    .default({}),
  header: z
    .object({
      firstName: text,
      lastName: text,
      title: text,
      email: text,
      phone: text,
      city: text,
      country: text,
      links: z.array(z.object({ label: text, url: text })).optional().default([]),
    })
    .optional()
    .default({ firstName: "", lastName: "", title: "", email: "", phone: "", city: "", country: "", links: [] }),
  sections: z.array(yamlSectionSchema).optional().default([]),
});

export type YamlDoc = z.infer<typeof yamlDocSchema>;
export type YamlSection = z.infer<typeof yamlSectionSchema>;
