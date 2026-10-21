import { ACCENT_SWATCHES } from "@/lib/defaults";

/**
 * Autocomplete and unknown-key warnings for the YAML Code view. Works line by line from indentation (not from a
 * YAML parse) so it keeps working while the text is half-typed and invalid. The field lists mirror schema.ts;
 * tests/unit/hints.test.ts checks they stay in sync.
 */

export type ValueHint = { value: string; info?: string };
/** `text` = markdown rich text (written as a `|-` block); `map` / `list` = nested blocks. */
export type FieldHint = { key: string; info: string; kind: "scalar" | "text" | "map" | "list"; values?: ValueHint[] };

const BOOL: ValueHint[] = [{ value: "true" }, { value: "false" }];
const scalar = (key: string, info: string, values?: ValueHint[]): FieldHint => ({ key, info, kind: "scalar", values });
const richText = (key: string, info: string): FieldHint => ({ key, info: `${info} (- bullets, **bold**, *italic*)`, kind: "text" });
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthNumbers: ValueHint[] = MONTHS.map((m, i) => ({ value: String(i + 1), info: m }));

export const SECTION_TYPE_HINTS: ValueHint[] = [
  { value: "summary", info: "A short paragraph about you" },
  { value: "experience", info: "Jobs: title, company, dates, description" },
  { value: "education", info: "Schools, degrees and graduation years" },
  { value: "skills", info: "A list of skills, optionally with a level 0–5" },
  { value: "certifications", info: "Certificates with issuer and dates" },
  { value: "custom", info: "Anything else: projects, awards, volunteering…" },
];

export const TOP_FIELDS: FieldHint[] = [
  scalar("name", "Resume name, as shown on the dashboard"),
  { key: "design", info: "Template, color, font and spacing", kind: "map" },
  { key: "header", info: "Your name and contact details", kind: "map" },
  { key: "sections", info: "The resume's sections, in order", kind: "list" },
];

export const DESIGN_FIELDS: FieldHint[] = [
  scalar("template", "Layout", [
    { value: "classic", info: "Classic: single column" },
    { value: "modern", info: "Modern: single column, bold headings" },
    { value: "sidebar", info: "Sidebar: two columns" },
  ]),
  scalar("accent", 'Accent color, in quotes, e.g. "#2f5d8a"', ACCENT_SWATCHES.map((c) => ({ value: `"${c}"` }))),
  scalar("font", "Font family", [
    { value: "source-sans", info: "Source Sans 3" },
    { value: "lato", info: "Lato" },
    { value: "georgia", info: "Georgia (serif)" },
  ]),
  scalar("fontSize", "Text size", [
    { value: "S", info: "Small" },
    { value: "M", info: "Medium" },
    { value: "L", info: "Large" },
  ]),
  scalar("sectionSpacing", "Space between sections, 0.5–2", ["0.75", "1", "1.25", "1.5"].map((value) => ({ value }))),
  scalar("lineHeight", "Line height, 1–2", ["1.2", "1.35", "1.5"].map((value) => ({ value }))),
  scalar("paper", "Paper size", [
    { value: "A4", info: "210 × 297 mm" },
    { value: "LETTER", info: "US Letter, 8.5 × 11 in" },
  ]),
];

export const HEADER_FIELDS: FieldHint[] = [
  scalar("firstName", "First name"),
  scalar("lastName", "Last name"),
  scalar("title", "Job title, shown under your name"),
  scalar("email", "Email address"),
  scalar("phone", "Phone number"),
  scalar("city", "City"),
  scalar("country", "Country"),
  { key: "links", info: "Links such as LinkedIn or a portfolio", kind: "list" },
];

export const LINK_FIELDS: FieldHint[] = [scalar("label", "Link text, e.g. LinkedIn"), scalar("url", "Web address")];

export const SECTION_FIELDS: FieldHint[] = [
  scalar("type", "What kind of section this is", SECTION_TYPE_HINTS),
  scalar("title", "Heading shown on the resume"),
  scalar("hidden", "Hide the section without deleting it", BOOL),
  scalar("column", "Column in two-column templates", [
    { value: "left", info: "The narrow side column" },
    { value: "right", info: "The main column" },
  ]),
];

const ITEMS: FieldHint = { key: "items", info: "The entries in this section", kind: "list" };
export const SECTION_BODY: Record<string, FieldHint[]> = {
  summary: [richText("text", "The summary text")],
  experience: [ITEMS],
  education: [ITEMS],
  skills: [ITEMS],
  certifications: [ITEMS],
  custom: [ITEMS],
};

export const ITEM_FIELDS: Record<string, FieldHint[]> = {
  summary: [],
  experience: [
    scalar("title", "Job title"),
    scalar("company", "Employer"),
    scalar("city", "City"),
    scalar("country", "Country"),
    scalar("start", "Start month, e.g. 2021-03"),
    scalar("end", "End month, e.g. 2023-07 (leave empty if current)"),
    scalar("current", "Still working here", BOOL),
    richText("description", "What you did"),
  ],
  education: [
    scalar("school", "School or university"),
    scalar("degree", "Degree, e.g. B.Sc."),
    scalar("field", "Field of study"),
    scalar("city", "City"),
    scalar("gradYear", "Graduation year, e.g. 2019"),
    richText("details", "Honors, coursework, thesis…"),
  ],
  skills: [
    scalar("name", "Skill name"),
    scalar("level", "Skill level (0 hides the level)", [
      { value: "0", info: "Not shown" },
      { value: "1", info: "Beginner" },
      { value: "2", info: "Elementary" },
      { value: "3", info: "Intermediate" },
      { value: "4", info: "Advanced" },
      { value: "5", info: "Expert" },
    ]),
  ],
  certifications: [
    scalar("name", "Certification name (required)"),
    scalar("issuer", "Issuing organization (required)"),
    scalar("issueMonth", "Issue month, 1–12", monthNumbers),
    scalar("issueYear", "Issue year, e.g. 2024"),
    scalar("expiryMonth", "Expiration month, 1–12", monthNumbers),
    scalar("expiryYear", "Expiration year"),
    scalar("credentialId", "Credential ID (up to 80 characters)"),
    scalar("credentialUrl", "Link to the credential"),
  ],
  custom: [scalar("heading", "Entry heading"), scalar("date", "Date, free text, e.g. 2022 – 2023"), richText("description", "Details")],
};

const uniqueByKey = (fields: FieldHint[]) => fields.filter((f, i) => fields.findIndex((g) => g.key === f.key) === i);

/** The fields allowed in the mapping at `path` ("[]" = a list item), or null where any content goes. */
export function fieldsFor(path: string[], sectionType: string | undefined): FieldHint[] | null {
  const p = path.join(".");
  const known = sectionType !== undefined && sectionType in SECTION_BODY;
  if (p === "") return TOP_FIELDS;
  if (p === "design") return DESIGN_FIELDS;
  if (p === "header") return HEADER_FIELDS;
  if (p === "header.links.[]") return LINK_FIELDS;
  if (p === "sections.[]") return [...SECTION_FIELDS, ...(known ? SECTION_BODY[sectionType] : uniqueByKey(Object.values(SECTION_BODY).flat()))];
  if (p === "sections.[].items.[]") return known ? ITEM_FIELDS[sectionType] : null;
  return null;
}

// --- reading the structure from indentation ----------------------------------------------------------------

type Line = { ind: number; dash: boolean; keyCol: number; key?: string; value: string };

/** One line's shape: indentation, an optional "- ", and an optional "key:" with its (comment-free) value. */
function parseLine(raw: string): Line | null {
  if (/^\s*(#.*)?$/.test(raw)) return null;
  const m = /^( *)(- +)?(.*)$/.exec(raw)!;
  const ind = m[1].length;
  const keyCol = ind + (m[2]?.length ?? 0);
  const kv = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/.exec(m[3]);
  const strip = (v: string) => v.replace(/(^|\s)#.*$/, "").trim();
  return kv ? { ind, dash: !!m[2], keyCol, key: kv[1], value: strip(kv[2] ?? "") } : { ind, dash: !!m[2], keyCol, value: strip(m[3]) };
}

type Place = { path: string[]; sectionType?: string; siblings: string[] };

/**
 * Where a key at (lineIdx, keyCol) sits: its path from the root, the type of the section it's in, and the other
 * keys of its mapping. Null inside multi-line text or anywhere the indentation doesn't describe a mapping.
 */
function placeOf(lines: string[], lineIdx: number, here: { ind: number; dash: boolean; keyCol: number }): Place | null {
  const path: string[] = []; // inner -> outer
  const itemStarts: number[] = []; // line of each "[]" in path, inner -> outer
  let mode: "map" | "seq" = here.dash ? "seq" : "map";
  let col = here.dash ? here.ind : here.keyCol;
  if (here.dash) {
    path.push("[]");
    itemStarts.push(lineIdx);
  }
  const enterItem = (i: number, L: Line) => {
    path.push("[]");
    itemStarts.push(i);
    mode = "seq";
    col = L.ind;
  };

  const atTop = () => mode === "map" && col === 0;
  for (let i = lineIdx - 1; i >= 0 && !atTop(); i--) {
    const L = parseLine(lines[i]);
    if (!L) continue;
    if (mode === "map") {
      if (L.keyCol > col) continue;
      if (L.keyCol === col) {
        if (L.dash) enterItem(i, L); // first key of the list item holding this mapping
        continue;
      }
      if (!L.key || L.value !== "") return null; // e.g. inside a "text: |-" block
      path.push(L.key);
      if (L.dash) enterItem(i, L);
      else col = L.keyCol;
    } else {
      if (L.dash && L.ind === col) continue; // an earlier item of the same list
      if (L.dash && L.ind > col) continue;
      if (!L.dash && L.keyCol > col) continue;
      if (!L.key || L.value !== "") return null;
      path.push(L.key);
      if (L.dash) enterItem(i, L);
      else {
        mode = "map";
        col = L.keyCol;
      }
    }
  }
  if (!atTop()) return null; // ran out of lines without reaching the top level
  path.reverse();
  itemStarts.reverse();

  // The section type: the `type:` key of the "sections" list item this position is in.
  let sectionType: string | undefined;
  if (path[0] === "sections" && path[1] === "[]") {
    const start = itemStarts[0];
    const head = parseLine(lines[start])!;
    sectionType = keysOfMapping(lines, start, head.keyCol, true).get("type")?.replace(/^["']|["']$/g, "");
  }
  const siblings = [...keysOfMapping(lines, lineIdx, here.keyCol, here.dash).keys()];
  return { path, sectionType, siblings };
}

/** Keys (and values) of the mapping whose keys sit at `col` and that contains line `at`. */
function keysOfMapping(lines: string[], at: number, col: number, atItemStart: boolean): Map<string, string> {
  const keys = new Map<string, string>();
  const add = (L: Line) => L.key && !keys.has(L.key) && keys.set(L.key, L.value);
  const self = parseLine(lines[at]);
  if (self && self.keyCol === col) add(self);
  if (!atItemStart) {
    for (let i = at - 1; i >= 0; i--) {
      const L = parseLine(lines[i]);
      if (!L || L.keyCol > col) continue;
      if (L.keyCol < col) break;
      add(L);
      if (L.dash) break; // the item's first line
    }
  }
  for (let i = at + 1; i < lines.length; i++) {
    const L = parseLine(lines[i]);
    if (!L || L.keyCol > col) continue;
    if (L.keyCol < col || L.dash) break;
    add(L);
  }
  return keys;
}

// --- autocomplete -------------------------------------------------------------------------------------------

export type Suggestion = { label: string; detail?: string; info?: string; insert: string; kind: "key" | "value"; reopen: boolean };
export type Suggestions = { from: number; to: number; options: Suggestion[] };

function keyInsert(f: FieldHint, keyCol: number): string {
  const child = " ".repeat(keyCol + 2);
  switch (f.kind) {
    case "scalar":
      return `${f.key}: `;
    case "text":
      return `${f.key}: |-\n${child}`;
    case "map":
      return `${f.key}:\n${child}`;
    case "list":
      return `${f.key}:\n${child}- `;
  }
}

/**
 * Suggestions at `pos`: allowed keys (minus ones already used) when typing a key, accepted values after
 * "key: ". `explicit` = the user asked (Ctrl+Space), so also suggest on an empty line.
 */
export function suggest(text: string, pos: number, explicit = false): Suggestions | null {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const lineEndAt = text.indexOf("\n", pos);
  const lineEnd = lineEndAt === -1 ? text.length : lineEndAt;
  const before = text.slice(lineStart, pos);
  const after = text.slice(pos, lineEnd);
  const lines = text.split("\n");
  const lineIdx = text.slice(0, lineStart).split("\n").length - 1;

  const keyMatch = /^( *)(- +)?([A-Za-z_][\w-]*)?$/.exec(before);
  if (keyMatch && !after.trim()) {
    const [, indent, dash = "", prefix = ""] = keyMatch;
    if (!prefix && !dash && !explicit) return null;
    const here = { ind: indent.length, dash: !!dash, keyCol: indent.length + dash.length };
    const place = placeOf(lines, lineIdx, here);
    const fields = place && fieldsFor(place.path, place.sectionType);
    if (!fields) return null;
    const used = new Set(place.siblings);
    const options = fields
      .filter((f) => !used.has(f.key))
      .map<Suggestion>((f) => ({ label: f.key, detail: f.kind === "scalar" ? undefined : f.kind, info: f.info, insert: keyInsert(f, here.keyCol), kind: "key", reopen: !!f.values }));
    return options.length ? { from: pos - prefix.length, to: pos, options } : null;
  }

  const valueMatch = /^( *)(- +)?([A-Za-z_][\w-]*):( +)([^#]*)$/.exec(before);
  if (valueMatch) {
    const [, indent, dash = "", key, , prefix] = valueMatch;
    const here = { ind: indent.length, dash: !!dash, keyCol: indent.length + dash.length };
    const place = placeOf(lines, lineIdx, here);
    const field = place && fieldsFor(place.path, place.sectionType)?.find((f) => f.key === key);
    if (!field?.values) return null;
    // Replace the whole current value (up to a comment), so picking a value never leaves part of the old one.
    const rest = /^[^#]*/.exec(after)![0].trimEnd();
    return {
      from: pos - prefix.length,
      to: pos + rest.length,
      options: field.values.map((v) => ({ label: v.value, detail: v.info, insert: v.value, kind: "value", reopen: false })),
    };
  }
  return null;
}

// --- unknown keys -------------------------------------------------------------------------------------------

export type KeyWarning = { line: number; column: number; message: string };

function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/** Keys the resume doesn't use (they would be silently dropped), with a "did you mean" when one is close. */
export function unknownKeys(text: string): KeyWarning[] {
  const lines = text.split("\n");
  const warnings: KeyWarning[] = [];
  lines.forEach((raw, i) => {
    const L = parseLine(raw);
    if (!L?.key) return;
    const place = placeOf(lines, i, L);
    const fields = place && fieldsFor(place.path, place.sectionType);
    if (!fields || fields.some((f) => f.key === L.key)) return;
    const close = fields.map((f) => ({ key: f.key, d: distance(L.key!, f.key) })).sort((a, b) => a.d - b.d)[0];
    const hint = close && close.d <= Math.max(1, Math.floor(close.key.length / 3)) ? ` Did you mean "${close.key}"?` : "";
    warnings.push({ line: i + 1, column: L.keyCol + 1, message: `"${L.key}" isn't a field here, so it's ignored.${hint}` });
  });
  return warnings;
}
