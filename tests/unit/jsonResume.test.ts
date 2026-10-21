import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { fromJsonResume, toJsonResume } from "@/lib/codec/jsonResume";
import { DEFAULT_STYLE, sampleContent, starterContent } from "@/lib/defaults";
import { contentSchema, type ResumeContent, type ResumeDoc } from "@/types/resume";

const fixture = (name: string) => JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../fixtures", name), "utf8"));

// The official JSON Resume v1.0.0 schema, vendored so the test runs offline.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(fixture("json-resume.schema.json"));

const asDoc = (content: ResumeContent): ResumeDoc =>
  ({ id: "r1", name: "Resume", templateId: "classic", style: { ...DEFAULT_STYLE }, content, updatedAt: new Date().toISOString() }) as ResumeDoc;

describe("JSON Resume export", () => {
  it.each([
    ["starter", starterContent({ name: "Ada Lovelace", email: "ada@example.com" })],
    ["sample", sampleContent()],
  ])("the %s resume validates against the official schema", (_, content) => {
    const { resume } = toJsonResume(asDoc(content));
    expect(validate(resume), JSON.stringify(validate.errors)).toBe(true);
    expect(resume.basics).toMatchObject({ name: expect.any(String) });
  });

  it("lists custom sections the standard can't hold", () => {
    const content = sampleContent();
    content.sections.push({ id: "x", type: "custom", title: "Speaking", hidden: false, column: 1, items: [{ id: "i", heading: "Talk", date: "", html: "" }] });
    const { resume, skippedSections } = toJsonResume(asDoc(content));
    expect(skippedSections).toEqual(["Speaking"]);
    expect(validate(resume)).toBe(true);
  });
});

describe("JSON Resume import", () => {
  it("maps the official sample and reports what it skipped", () => {
    const r = fromJsonResume(fixture("json-resume.sample.json"));
    if (!r.ok) throw new Error(r.error);
    expect(r.content.header.firstName).toBeTruthy();
    expect(r.imported.length).toBeGreaterThanOrEqual(5);
    expect(r.skipped).toEqual(expect.arrayContaining(["Volunteer", "Publications", "References"]));
    expect(contentSchema.safeParse(r.content).success).toBe(true);
  });

  it.each([[{ hello: "world" }], [[1, 2]], ["text"], [null]])("rejects %j", (input) => {
    const r = fromJsonResume(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("doesn't look like a JSON Resume file");
  });

  it("keeps the content through export then import", () => {
    const original = sampleContent();
    const r = fromJsonResume(toJsonResume(asDoc(original)).resume);
    if (!r.ok) throw new Error(r.error);
    expect(r.content.header).toMatchObject({ firstName: original.header.firstName, lastName: original.header.lastName, email: original.header.email });
    const titles = (c: ResumeContent) => c.sections.map((s) => s.type).sort();
    expect(titles(r.content)).toEqual(titles(original));
    const jobs = (c: ResumeContent) => c.sections.flatMap((s) => (s.type === "experience" ? s.items.map((i) => [i.title, i.company, i.start]) : []));
    expect(jobs(r.content)).toEqual(jobs(original));
  });
});
