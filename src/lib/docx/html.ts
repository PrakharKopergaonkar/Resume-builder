import { Paragraph, TextRun, type IParagraphOptions } from "docx";

/**
 * Converts the resume's stored rich text into Word paragraphs.
 *
 * Stored rich text is sanitized on save to `p, br, strong/b, em/i, u, ul, ol, li` with no attributes
 * (sanitizeContent in src/lib/resumes.ts), so a small tokenizer for exactly that set is enough.
 */

export const BULLET_REF = "resume-bullets";
export const NUMBER_REF = "resume-numbers";

export type InlineRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean } | { lineBreak: true };

/** One paragraph's worth of content; `list` is set for list items (level 0 = top level). */
export type Block = {
  runs: InlineRun[];
  list?: { kind: "bullet" | "number"; level: number; instance: number };
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function decode(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    const lower = e.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower];
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return m; // unknown entity: keep as typed rather than drop it
  });
}

/**
 * Pure HTML → blocks step (unit-tested on its own). `nextNumberInstance` hands out a fresh numbering instance
 * for every numbered list so each one restarts at 1.
 */
export function htmlToBlocks(html: string, nextNumberInstance: () => number): Block[] {
  const blocks: Block[] = [];
  const lists: { kind: "bullet" | "number"; instance: number }[] = [];
  const marks = { bold: 0, italic: 0, underline: 0 };
  let current: Block | null = null;
  let inListItem = 0;

  const flush = () => {
    if (current && current.runs.some((r) => "lineBreak" in r || r.text.trim())) blocks.push(current);
    current = null;
  };
  const open = (): Block => {
    if (!current) {
      const list = lists.at(-1);
      current = inListItem && list ? { runs: [], list: { kind: list.kind, level: lists.length - 1, instance: list.instance } } : { runs: [] };
    }
    return current;
  };

  for (const m of html.matchAll(/<(\/?)([a-z0-9]+)\s*\/?>|([^<]+)/gi)) {
    const [, closing, rawTag, text] = m;
    if (text !== undefined) {
      const value = decode(text).replace(/\s+/g, " ");
      if (!value.trim() && !current) continue; // whitespace between block tags
      open().runs.push({
        text: value,
        bold: marks.bold > 0 || undefined,
        italic: marks.italic > 0 || undefined,
        underline: marks.underline > 0 || undefined,
      });
      continue;
    }
    const tag = rawTag.toLowerCase();
    const delta = closing ? -1 : 1;
    switch (tag) {
      case "strong":
      case "b":
        marks.bold = Math.max(0, marks.bold + delta);
        break;
      case "em":
      case "i":
        marks.italic = Math.max(0, marks.italic + delta);
        break;
      case "u":
        marks.underline = Math.max(0, marks.underline + delta);
        break;
      case "br":
        open().runs.push({ lineBreak: true });
        break;
      case "p":
        // Inside a list item TipTap wraps the text in <p>; a second <p> in the same item becomes a line break.
        if (inListItem) {
          if (!closing && current && (current as Block).runs.length) (current as Block).runs.push({ lineBreak: true });
        } else {
          flush();
        }
        break;
      case "ul":
      case "ol":
        flush();
        if (closing) lists.pop();
        else lists.push(tag === "ol" ? { kind: "number", instance: nextNumberInstance() } : { kind: "bullet", instance: 0 });
        break;
      case "li":
        flush();
        inListItem = Math.max(0, inListItem + delta);
        break;
      default:
        break; // anything else (not expected after sanitizing) contributes only its text
    }
  }
  flush();
  return blocks;
}

/** Blocks → docx paragraphs. `paragraph` options (spacing etc.) apply to every paragraph. */
export function blocksToParagraphs(blocks: Block[], paragraph: Partial<IParagraphOptions> = {}): Paragraph[] {
  return blocks.map(
    (b) =>
      new Paragraph({
        ...paragraph,
        numbering: b.list
          ? { reference: b.list.kind === "number" ? NUMBER_REF : BULLET_REF, level: Math.min(b.list.level, 2), instance: b.list.instance || undefined }
          : undefined,
        children: b.runs.map((r) =>
          "lineBreak" in r ? new TextRun({ break: 1 }) : new TextRun({ text: r.text, bold: r.bold, italics: r.italic, underline: r.underline ? {} : undefined }),
        ),
      }),
  );
}
