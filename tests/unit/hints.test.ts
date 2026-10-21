import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  DESIGN_FIELDS,
  HEADER_FIELDS,
  ITEM_FIELDS,
  LINK_FIELDS,
  SECTION_BODY,
  SECTION_FIELDS,
  SECTION_TYPE_HINTS,
  suggest,
  TOP_FIELDS,
  unknownKeys,
  type FieldHint,
} from "@/lib/codec/hints";
import { yamlDocSchema, yamlSectionSchema } from "@/lib/codec/schema";
import { toYaml } from "@/lib/codec/yaml";
import { DEFAULT_STYLE, sampleContent } from "@/lib/defaults";
import { FONT_IDS, TEMPLATE_IDS } from "@/types/resume";

// --- the hint tables match schema.ts ---------------------------------------------------------------------------

type Def = { type: string; innerType?: z.ZodType; out?: z.ZodType; shape?: Record<string, z.ZodType>; element?: z.ZodType; options?: z.ZodType[] };
const def = (s: z.ZodType) => (s as unknown as { _zod: { def: Def } })._zod.def;
/** Strips optional/default/preprocess wrappers. */
function unwrap(s: z.ZodType): z.ZodType {
  const d = def(s);
  if (d.type === "optional" || d.type === "default") return unwrap(d.innerType!);
  if (d.type === "pipe") return unwrap(d.out!);
  return s;
}
const shapeOf = (s: z.ZodType) => def(unwrap(s)).shape!;
const keysOf = (s: z.ZodType) => Object.keys(shapeOf(s)).sort();
const elementOf = (s: z.ZodType) => def(unwrap(s)).element!;
const names = (fields: FieldHint[]) => fields.map((f) => f.key).sort();
const values = (fields: FieldHint[], key: string) => fields.find((f) => f.key === key)!.values!.map((v) => v.value);

describe("hint tables match the YAML schema", () => {
  const top = shapeOf(yamlDocSchema);
  it("top level, design, header and links", () => {
    expect(names(TOP_FIELDS)).toEqual(keysOf(yamlDocSchema));
    expect(names(DESIGN_FIELDS)).toEqual(keysOf(top.design));
    expect(names(HEADER_FIELDS)).toEqual(keysOf(top.header));
    expect(names(LINK_FIELDS)).toEqual(keysOf(elementOf(shapeOf(top.header).links)));
  });

  it("every section type and its items", () => {
    const sections = def(yamlSectionSchema).options!;
    expect(SECTION_TYPE_HINTS.map((h) => h.value).sort()).toEqual(Object.keys(SECTION_BODY).sort());
    for (const option of sections) {
      const shape = shapeOf(option);
      const type = (def(shape.type) as unknown as { values: string[] }).values[0];
      expect(names([...SECTION_FIELDS, ...SECTION_BODY[type]]), type).toEqual(keysOf(option));
      if (!shape.items) continue;
      let item = unwrap(elementOf(shape.items));
      if (def(item).type === "union") item = def(item).options!.find((o) => def(unwrap(o)).type === "object")!; // skills: "name" | { name, level }
      expect(names(ITEM_FIELDS[type]), `${type} items`).toEqual(keysOf(item));
    }
  });

  it("offers exactly the accepted enum values", () => {
    expect(values(DESIGN_FIELDS, "template")).toEqual([...TEMPLATE_IDS]);
    expect(values(DESIGN_FIELDS, "font")).toEqual([...FONT_IDS]);
    expect(values(DESIGN_FIELDS, "paper")).toEqual(["A4", "LETTER"]);
    expect(values(DESIGN_FIELDS, "fontSize")).toEqual(["S", "M", "L"]);
  });
});

// --- suggestions at a cursor ------------------------------------------------------------------------------------

const sample = toYaml({ name: "My resume", templateId: "classic", style: { ...DEFAULT_STYLE }, content: sampleContent() });

/** Puts the cursor where "|" is in `snippet`, after inserting the snippet below the line containing `after`. */
function at(snippet: string, after?: string, text = sample) {
  const cursor = snippet.indexOf("|");
  const clean = snippet.replace("|", "");
  let full: string, pos: number;
  if (after === undefined) {
    full = `${text}${clean}`;
    pos = text.length + cursor;
  } else {
    const lineEnd = text.indexOf("\n", text.indexOf(after)) + 1;
    full = text.slice(0, lineEnd) + clean + text.slice(lineEnd);
    pos = lineEnd + cursor;
  }
  return suggest(full, pos);
}
const labels = (r: ReturnType<typeof suggest>) => r?.options.map((o) => o.label) ?? [];

describe("suggest", () => {
  it("offers top-level keys that aren't used yet", () => {
    expect(labels(suggest("name: x\nde", 10))).toEqual(["design", "header", "sections"]);
    expect(labels(suggest("", 0, true))).toEqual(["name", "design", "header", "sections"]);
  });

  it("stays quiet on an empty line unless asked", () => {
    expect(suggest("name: x\n", 8)).toBeNull();
    expect(labels(suggest("name: x\n", 8, true))).toContain("design");
  });

  it("offers design and header keys by indentation, minus the ones already there", () => {
    const designEnd = sample.indexOf("\n", sample.indexOf("  paper:")) + 1;
    const withBlank = `${sample.slice(0, designEnd)}  \n${sample.slice(designEnd)}`;
    expect(suggest(withBlank, designEnd + 2, true)).toBeNull(); // every design key is already used
    const header = sample.replace(/\n  phone: .*/, "");
    expect(labels(at("  ph|\n", "  email:", header))).toEqual(HEADER_FIELDS.map((f) => f.key).filter((k) => !/^(firstName|lastName|title|email|city|country|links)$/.test(k)));
  });

  it("knows the section type: experience items get job fields, skills get name and level", () => {
    const exp = at("      - |\n", "    items:");
    expect(labels(exp)).toEqual(ITEM_FIELDS.experience.map((f) => f.key));
    const skillsAt = sample.indexOf("type: skills");
    const skillItems = sample.indexOf("    items:", skillsAt);
    const text = `${sample.slice(0, sample.indexOf("\n", skillItems) + 1)}      - na\n${sample.slice(sample.indexOf("\n", skillItems) + 1)}`;
    const pos = sample.indexOf("\n", skillItems) + 1 + "      - na".length;
    expect(labels(suggest(text, pos))).toEqual(["name", "level"]);
  });

  it("starts a new section with its type and offers the section types as values", () => {
    const r = at("  - |");
    expect(labels(r)[0]).toBe("type");
    expect(r!.options[0].reopen).toBe(true);
    expect(labels(at("  - type: |"))).toEqual(SECTION_TYPE_HINTS.map((h) => h.value));
  });

  it("offers accepted values and replaces the whole old value", () => {
    const text = sample;
    const pos = text.indexOf("template: classic") + "template: cl".length;
    const r = suggest(text, pos)!;
    expect(labels(r)).toEqual([...TEMPLATE_IDS]);
    expect(text.slice(r.from, r.to)).toBe("classic");
    expect(labels(suggest("design:\n  paper: ", "design:\n  paper: ".length))).toEqual(["A4", "LETTER"]);
  });

  it("inserts blocks for nested keys", () => {
    const r = suggest("name: x\nsect", 12)!;
    expect(r.options.find((o) => o.label === "sections")!.insert).toBe("sections:\n  - ");
    const fresh = "sections:\n  - type: summary\n    te";
    const summary = suggest(fresh, fresh.length);
    expect(summary!.options.find((o) => o.label === "text")!.insert).toBe("text: |-\n      ");
  });

  it("says nothing inside multi-line text or free-text values", () => {
    const summaryText = sample.indexOf("text: |-");
    const inside = sample.indexOf("\n", summaryText) + 1;
    expect(suggest(sample, inside + 8)).toBeNull();
    expect(suggest("name: My re", 11)).toBeNull();
  });
});

describe("unknownKeys", () => {
  it("finds nothing in a generated resume", () => {
    expect(unknownKeys(sample)).toEqual([]);
  });

  it("flags misspelled keys with a suggestion and the right line", () => {
    const text = sample.replace("  firstName:", "  frstName:").replace(/(\n\s+)company:/, "$1compnay:");
    const warnings = unknownKeys(text);
    expect(warnings.map((w) => w.message)).toEqual([
      `"frstName" isn't a field here, so it's ignored. Did you mean "firstName"?`,
      `"compnay" isn't a field here, so it's ignored. Did you mean "company"?`,
    ]);
    expect(text.split("\n")[warnings[0].line - 1]).toContain("frstName:");
  });

  it("knows which fields belong to which section type", () => {
    const text = sample.replace(/(type: skills\n)/, "$1    text: oops\n");
    expect(unknownKeys(text).map((w) => w.message)).toEqual([`"text" isn't a field here, so it's ignored.`]);
  });
});
