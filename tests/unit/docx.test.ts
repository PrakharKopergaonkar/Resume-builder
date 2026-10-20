import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildResumeDocx } from "@/lib/docx/build";
import { htmlToBlocks } from "@/lib/docx/html";
import { DEFAULT_STYLE, starterContent } from "@/lib/defaults";
import type { ResumeDoc, ResumeStyle } from "@/types/resume";

const counter = () => {
  let n = 0;
  return () => ++n;
};

describe("htmlToBlocks", () => {
  it("keeps bold, italic and underline as run formatting", () => {
    const [b] = htmlToBlocks("<p>Plain <strong>bold</strong> <em>it</em> <u>u</u> <b><i>both</i></b></p>", counter());
    expect(b.list).toBeUndefined();
    const runs = b.runs.filter((r) => "text" in r && r.text.trim());
    expect(runs).toEqual([
      { text: "Plain " },
      { text: "bold", bold: true },
      { text: "it", italic: true },
      { text: "u", underline: true },
      { text: "both", bold: true, italic: true },
    ]);
  });

  it("turns lists into list blocks with no bullet characters in the text", () => {
    const blocks = htmlToBlocks("<ul><li><p>One</p></li><li><p>Two</p></li></ul>", counter());
    expect(blocks.map((b) => b.list?.kind)).toEqual(["bullet", "bullet"]);
    expect(JSON.stringify(blocks)).not.toContain("•");
  });

  it("gives every numbered list its own instance so numbering restarts at 1", () => {
    const blocks = htmlToBlocks("<ol><li>a</li><li>b</li></ol><p>between</p><ol><li>c</li></ol>", counter());
    const instances = blocks.filter((b) => b.list?.kind === "number").map((b) => b.list!.instance);
    expect(instances).toEqual([1, 1, 2]);
  });

  it("handles nesting, line breaks and entities", () => {
    const blocks = htmlToBlocks("<ul><li><p>Outer</p><ul><li><p>Inner</p></li></ul></li></ul><p>A&amp;B &lt;x&gt; &#39;q&#39;<br>next</p>", counter());
    expect(blocks[0].list?.level).toBe(0);
    expect(blocks[1].list?.level).toBe(1);
    const last = blocks.at(-1)!;
    expect(last.runs.some((r) => "lineBreak" in r)).toBe(true);
    expect(last.runs.map((r) => ("text" in r ? r.text : "\n")).join("")).toBe("A&B <x> 'q'\nnext");
  });

  it("skips empty paragraphs", () => {
    expect(htmlToBlocks("<p></p><p>   </p>", counter())).toEqual([]);
  });
});

async function documentXml(style: Partial<ResumeStyle> = {}, edit?: (d: ResumeDoc) => void) {
  const doc: ResumeDoc = {
    id: "r1",
    name: "Test",
    templateId: "sidebar",
    style: { ...DEFAULT_STYLE, ...style },
    content: starterContent({ name: "Ada Lovelace", email: "ada@example.com" }),
    createdAt: "",
    updatedAt: "",
  };
  edit?.(doc);
  const zip = await JSZip.loadAsync(await buildResumeDocx(doc));
  const text = async (f: string) => (await zip.file(f)?.async("string")) ?? "";
  return { doc: await text("word/document.xml"), styles: await text("word/styles.xml"), numbering: await text("word/numbering.xml") };
}

const plain = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

describe("buildResumeDocx", () => {
  it("contains every visible section in order, starting with the name", async () => {
    const { doc } = await documentXml();
    const text = plain(doc);
    expect(text.startsWith("Ada Lovelace")).toBe(true);
    const order = ["Summary", "Work History", "Education", "Skills", "Certifications", "Languages"].map((t) => text.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text).toContain("English (5/5)");
  });

  it("leaves hidden sections out", async () => {
    const { doc } = await documentXml({}, (d) => {
      d.content.sections.find((s) => s.title === "Languages")!.hidden = true;
    });
    expect(plain(doc)).not.toContain("Languages");
  });

  it("uses the paper size, accent color and fonts", async () => {
    const a4 = await documentXml();
    expect(a4.doc).toContain('w:w="11906"');
    const letter = await documentXml({ paper: "LETTER", font: "georgia", accent: "#b45309" });
    expect(letter.doc).toContain('w:w="12240"');
    expect(letter.styles).toContain("B45309");
    expect(letter.styles).toContain('w:ascii="Georgia"');
    expect(a4.styles).toContain('w:ascii="Arial"');
  });

  it("styles section titles as Heading 2 and lists with real numbering", async () => {
    const { doc, numbering } = await documentXml();
    expect(doc).toContain('<w:pStyle w:val="Heading2"/>');
    expect(doc).toContain("<w:numPr>");
    expect(numbering).toContain('w:val="bullet"');
    expect(plain(doc)).not.toContain("•");
  });

  it("makes email and credential links clickable and right-aligns dates", async () => {
    const { doc } = await documentXml();
    expect(doc.match(/<w:hyperlink /g)?.length ?? 0).toBeGreaterThanOrEqual(3); // email, LinkedIn, credential
    expect(doc).toContain('<w:tab w:val="right"');
  });
});
