import { Paragraph, TextRun, type IParagraphOptions } from "docx";
import type { Block } from "@/lib/richtext";

/** Word-specific half of the rich-text conversion; parsing lives in src/lib/richtext.ts. */
export { htmlToBlocks, type Block, type InlineRun } from "@/lib/richtext";

export const BULLET_REF = "resume-bullets";
export const NUMBER_REF = "resume-numbers";

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
