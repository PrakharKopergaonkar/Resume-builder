import { describe, expect, it } from "vitest";
import { fromYaml, toYaml } from "@/lib/codec/yaml";
import { htmlToMarkdown, markdownToHtml } from "@/lib/codec/markdown";
import { DEFAULT_STYLE, sampleContent, starterContent } from "@/lib/defaults";
import type { Snapshot } from "@/store/editor";
import { contentSchema } from "@/types/resume";

/** The sample resume plus a custom section, so every section type is covered. */
function fullSnapshot(): Snapshot {
  const content = sampleContent();
  content.sections.push({
    id: "custom-1",
    type: "custom",
    title: "Projects",
    hidden: true,
    column: 0,
    items: [{ id: "c1", heading: "Open source CLI", date: "2022", html: "<p>Built a <strong>fast</strong> <em>tool</em>.</p>" }],
  });
  return { name: "My resume", templateId: "classic", style: { ...DEFAULT_STYLE }, content };
}

const ok = (text: string, previous: Snapshot) => {
  const r = fromYaml(text, previous);
  if (!r.ok) throw new Error(`expected valid YAML, got ${JSON.stringify(r.errors)}`);
  return r.doc;
};
const errors = (text: string, previous: Snapshot) => {
  const r = fromYaml(text, previous);
  if (r.ok) throw new Error("expected errors");
  return r.errors;
};
/** Line number (1-based) of the first line containing `needle`. */
const lineOf = (text: string, needle: string) => text.split("\n").findIndex((l) => l.includes(needle)) + 1;

describe("YAML round trip", () => {
  it("returns exactly the same resume (ids included) for every section type", () => {
    const doc = fullSnapshot();
    expect(ok(toYaml(doc), doc)).toEqual(doc);
  });

  it("round-trips the starter resume", () => {
    const doc: Snapshot = { name: "Sample Resume", templateId: "modern", style: { ...DEFAULT_STYLE }, content: starterContent({ name: "Ada Lovelace", email: "ada@example.com" }) };
    expect(ok(toYaml(doc), doc)).toEqual(doc);
  });

  it("hides internal ids from the text", () => {
    const doc = fullSnapshot();
    const text = toYaml(doc);
    for (const s of doc.content.sections) expect(text).not.toContain(s.id);
  });

  it("keeps ids by position and gives new items fresh ids", () => {
    const doc = fullSnapshot();
    const skills = doc.content.sections.find((s) => s.type === "skills")!;
    const text = toYaml(doc).replace(/(type: skills[\s\S]*?items:\n)/, "$1      - Brand new skill\n");
    const next = ok(text, doc);
    const nextSkills = next.content.sections.find((s) => s.type === "skills")!;
    expect(nextSkills.id).toBe(skills.id);
    expect(nextSkills.type === "skills" && nextSkills.items[0].name).toBe("Brand new skill");
    expect(nextSkills.type === "skills" && skills.type === "skills" && nextSkills.items[0].id).toBe(skills.items[0].id);
    const newIds = nextSkills.type === "skills" ? nextSkills.items.map((i) => i.id) : [];
    expect(new Set(newIds).size).toBe(newIds.length);
  });

  it("applies edits to header, design and rich text", () => {
    const doc = fullSnapshot();
    const summaryBefore = doc.content.sections.find((s) => s.type === "summary")!;
    if (summaryBefore.type === "summary") summaryBefore.html = ""; // so its YAML is a predictable `text: ""`
    const text = toYaml(doc)
      .replace(/template: \w+/, "template: modern")
      .replace(/firstName: .*/, "firstName: Grace")
      .replace(/^(\s+)text: ""$/m, "$1text: |-\n$1  - First **point**\n$1  - Second");
    const next = ok(text, doc);
    expect(next.templateId).toBe("modern");
    expect(next.content.header.firstName).toBe("Grace");
    const summary = next.content.sections.find((s) => s.type === "summary")!;
    expect(summary.type === "summary" && summary.html).toBe("<ul><li><p>First <strong>point</strong></p></li><li><p>Second</p></li></ul>");
  });

  it("keeps current design values for keys left out", () => {
    const doc = fullSnapshot();
    doc.style.accent = "#123456";
    const next = ok(toYaml(doc).replace(/\n  accent: .*/, ""), doc);
    expect(next.style.accent).toBe("#123456");
  });

  it("produces content that passes the stored model's validation", () => {
    const doc = fullSnapshot();
    const next = ok(toYaml(doc).replace(/firstName: .*/, "firstName: 2024"), doc);
    expect(contentSchema.safeParse(next.content).success).toBe(true);
    expect(next.content.header.firstName).toBe("2024");
  });
});

describe("YAML errors", () => {
  it("points at a bad date with its path and line", () => {
    const doc = fullSnapshot();
    const text = toYaml(doc).replace(/start: .*/, "start: July 2020");
    const [e] = errors(text, doc);
    expect(e.message).toMatch(/^sections\[\d+\]\.items\[0\]\.start: expected a month like 2023-07/);
    expect(e.line).toBe(lineOf(text, "start: July 2020"));
  });

  it("names the allowed section types", () => {
    const doc = fullSnapshot();
    const text = toYaml(doc).replace("type: summary", "type: hobbies");
    const [e] = errors(text, doc);
    expect(e.message).toContain("unknown section type (use one of: summary, experience");
    expect(e.line).toBe(lineOf(text, "type: hobbies"));
  });

  it("reports one clear error for broken indentation", () => {
    const doc = fullSnapshot();
    const text = toYaml(doc).replace(/\n  firstName:/, "\n firstName:");
    const errs = errors(text, doc);
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toContain("check the indentation");
  });

  it("requires a name", () => {
    const doc = fullSnapshot();
    const [e] = errors(toYaml(doc).replace(/^name: .*/m, 'name: ""'), doc);
    expect(e.message).toContain("the resume needs a name");
  });
});

describe("markdown <-> rich text", () => {
  const cases: [string, string][] = [
    ["<p>Hello <strong>bold</strong> and <em>italic</em> and <u>under</u></p>", "Hello **bold** and *italic* and <u>under</u>"],
    ["<ul><li><p>One</p></li><li><p>Two</p></li></ul>", "- One\n- Two"],
    ["<ol><li><p>First</p></li><li><p>Second</p></li></ol>", "1. First\n2. Second"],
    ["<ul><li><p>Outer</p><ul><li><p>Inner</p></li></ul></li><li><p>Outer 2</p></li></ul>", "- Outer\n  - Inner\n- Outer 2"],
    ["<p>Intro</p><ul><li><p>Point</p></li></ul>", "Intro\n- Point"],
    ["<p>2 * 3 &lt; 7 \\ ok</p>", "2 \\* 3 \\< 7 \\\\ ok"],
  ];
  it.each(cases)("%s", (html, md) => {
    expect(htmlToMarkdown(html)).toBe(md);
    expect(markdownToHtml(md)).toBe(html);
  });

  it("closes unmatched markers at the end of the line", () => {
    expect(markdownToHtml("**open")).toBe("<p><strong>open</strong></p>");
  });

  it("escapes raw HTML instead of passing it through", () => {
    expect(markdownToHtml("<script>alert(1)</script> **x**")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt; <strong>x</strong></p>");
  });
});
