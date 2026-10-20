import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  type ILevelsOptions,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import { certificationDates, contactItems, isSectionVisible } from "@/components/renderer/sections";
import { formatRange, hasText, joinParts, normalizeUrl } from "@/components/renderer/format";
import { PAGE_MARGIN_MM } from "@/lib/paper";
import type { ResumeDoc, ResumeStyle, Section } from "@/types/resume";
import { blocksToParagraphs, BULLET_REF, htmlToBlocks, NUMBER_REF } from "./html";

/**
 * Builds a single-column, ATS-friendly Word document from a resume. It keeps the resume's accent color, font,
 * size, spacing and paper size, and uses the same wording as the PDF (shared helpers from the renderer).
 */

// Page sizes in twips (DXA; 1440 = 1 inch). docx defaults to A4, so Letter must be set explicitly.
const PAGE = { A4: { width: 11906, height: 16838 }, LETTER: { width: 12240, height: 15840 } } as const;

// Half-points (Word's unit for font sizes): 9.5 / 10.5 / 11.5 pt, like the PDF.
const BODY_SIZE: Record<ResumeStyle["fontSize"], number> = { S: 19, M: 21, L: 23 };

/**
 * Word only uses fonts installed on the reader's machine, so the web fonts map to ones every Windows and Mac machine
 * (and Google Docs) has. Arial rather than Calibri: Macs without Office don't ship Calibri.
 */
const WORD_FONT: Record<ResumeStyle["font"], string> = { "source-sans": "Arial", lato: "Arial", georgia: "Georgia" };

const TEXT_COLOR = "1F2328";
const MUTED_COLOR = "6B7280";

function numberingLevels(kind: "bullet" | "number"): ILevelsOptions[] {
  return [0, 1, 2].map((level) => ({
    level,
    format: kind === "bullet" ? LevelFormat.BULLET : LevelFormat.DECIMAL,
    // The bullet glyph lives in the numbering definition; list text itself never contains "•".
    text: kind === "bullet" ? ["•", "◦", "▪"][level] : `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } },
  }));
}

export async function buildResumeDocx(doc: ResumeDoc): Promise<Buffer> {
  const { header, sections } = doc.content;
  const { style } = doc;
  const page = PAGE[style.paper];
  const marginX = convertMillimetersToTwip(PAGE_MARGIN_MM.x);
  const marginY = convertMillimetersToTwip(PAGE_MARGIN_MM.y);
  const accent = style.accent.replace("#", "").toUpperCase();
  const font = WORD_FONT[style.font] ?? "Arial";
  const size = BODY_SIZE[style.fontSize] ?? 21;
  const gap = Math.round(140 * style.sectionSpacing); // space between entries, in twips

  let numberInstance = 0;
  const nextNumberInstance = () => ++numberInstance;
  const rich = (html: string, extra: Partial<IParagraphOptions> = {}) =>
    hasText(html) ? blocksToParagraphs(htmlToBlocks(html, nextNumberInstance), { spacing: { before: 40 }, ...extra }) : [];

  /**
   * "Left text            right text" on one line: a right-aligned tab stop at the right margin. (Plain tab stops
   * are the most widely supported way to do this across Word, Google Docs, Pages and LibreOffice.)
   */
  const contentWidth = page.width - 2 * marginX;
  const headLine = (left: ParagraphChild[], right: string, opts: Partial<IParagraphOptions> = {}) =>
    new Paragraph({
      keepNext: true,
      tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
      ...opts,
      children: right ? [...left, new TextRun({ children: [new Tab(), right], color: MUTED_COLOR })] : left,
    });

  const muted = (text: string) => new Paragraph({ keepNext: true, children: [new TextRun({ text, color: MUTED_COLOR })] });

  const link = (text: string, href: string) =>
    new ExternalHyperlink({ link: href, children: [new TextRun({ text, color: accent, underline: {} })] });

  const sectionBody = (s: Section): Paragraph[] => {
    const entryGap = (i: number) => ({ spacing: { before: i === 0 ? 0 : gap } });
    switch (s.type) {
      case "summary":
        return rich(s.html, { spacing: { before: 0 } });

      case "experience":
        return s.items
          .filter((i) => i.title || i.company || hasText(i.html))
          .flatMap((i, n) => [
            headLine(
              [new TextRun({ text: i.title, bold: true }), ...(i.company ? [new TextRun({ text: i.title ? ` · ${i.company}` : i.company })] : [])],
              formatRange(i.start, i.end, i.current),
              entryGap(n),
            ),
            ...(i.city || i.country ? [muted(joinParts(i.city, i.country))] : []),
            ...rich(i.html),
          ]);

      case "education":
        return s.items
          .filter((i) => i.school || i.degree || i.field)
          .flatMap((i, n) => [
            headLine([new TextRun({ text: joinParts(i.degree, i.field), bold: true })], i.gradYear, entryGap(n)),
            ...(i.school || i.city ? [muted(joinParts(i.school, i.city))] : []),
            ...rich(i.html),
          ]);

      case "skills": {
        // Plain text keeps applicant tracking systems happy; levels read "English (5/5)".
        const line = s.items
          .filter((i) => i.name.trim())
          .map((i) => (i.level ? `${i.name} (${i.level}/5)` : i.name))
          .join(" · ");
        return [new Paragraph({ children: [new TextRun(line)] })];
      }

      case "certifications":
        return s.items
          .filter((i) => i.name.trim())
          .flatMap((i, n) => {
            const url = normalizeUrl(i.credentialUrl);
            const details: ParagraphChild[] = [];
            if (i.credentialId) details.push(new TextRun({ text: `Credential ID ${i.credentialId}`, color: MUTED_COLOR }));
            if (i.credentialId && url) details.push(new TextRun({ text: " · ", color: MUTED_COLOR }));
            if (url) details.push(link("Show credential", url));
            return [
              headLine(
                [new TextRun({ text: i.name, bold: true }), ...(i.issuer ? [new TextRun({ text: ` · ${i.issuer}` })] : [])],
                certificationDates(i),
                entryGap(n),
              ),
              ...(details.length ? [new Paragraph({ children: details })] : []),
            ];
          });

      case "custom":
        return s.items
          .filter((i) => i.heading || hasText(i.html))
          .flatMap((i, n) => [
            ...(i.heading || i.date ? [headLine([new TextRun({ text: i.heading, bold: true })], i.date, entryGap(n))] : []),
            ...rich(i.html, n > 0 && !i.heading && !i.date ? entryGap(n) : {}),
          ]);
    }
  };

  const fullName = [header.firstName, header.lastName].filter(Boolean).join(" ") || "Your Name";
  const contacts = contactItems(header);
  const contactLine: ParagraphChild[] = contacts.flatMap((c, n) => [
    ...(n ? [new TextRun({ text: "  |  ", color: MUTED_COLOR })] : []),
    c.href ? link(c.text, c.href) : new TextRun({ text: c.text, color: MUTED_COLOR }),
  ]);

  const body: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: fullName, bold: true, size: Math.round(size * 2.2) })] }),
    ...(header.title ? [new Paragraph({ children: [new TextRun({ text: header.title, color: accent, size: Math.round(size * 1.15) })] })] : []),
    ...(contactLine.length ? [new Paragraph({ spacing: { before: 60 }, children: contactLine })] : []),
    ...sections.filter(isSectionVisible).flatMap((s) => [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(s.title)] }), ...sectionBody(s)]),
  ];

  const document = new Document({
    title: doc.name,
    creator: fullName,
    description: "Resume",
    styles: {
      default: {
        document: {
          run: { font, size, color: TEXT_COLOR },
          paragraph: { spacing: { line: Math.round(240 * style.lineHeight), lineRule: LineRuleType.AUTO, after: 0 } },
        },
      },
      // Override Word's built-in Heading 2 so section titles appear in the navigation pane and can be restyled at once.
      paragraphStyles: [
        // Body text style. Fonts are also set in the document defaults, but some apps only read them from Normal.
        {
          id: "Normal",
          name: "Normal",
          quickFormat: true,
          run: { font, size, color: TEXT_COLOR },
          paragraph: { spacing: { line: Math.round(240 * style.lineHeight), lineRule: LineRuleType.AUTO, after: 0 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font, size: size + 1, bold: true, color: accent, allCaps: true, characterSpacing: 16 },
          paragraph: {
            keepNext: true,
            outlineLevel: 1,
            spacing: { before: Math.round(280 * style.sectionSpacing), after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 2 } },
          },
        },
      ],
    },
    numbering: {
      config: [
        { reference: BULLET_REF, levels: numberingLevels("bullet") },
        { reference: NUMBER_REF, levels: numberingLevels("number") },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: page, margin: { top: marginY, bottom: marginY, left: marginX, right: marginX } },
        },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(document);
}
