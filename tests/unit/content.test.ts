import { describe, expect, it } from "vitest";
import { formatMonth, formatRange, hasText } from "@/components/renderer/format";
import { isSectionVisible } from "@/components/renderer/sections";
import { blankContent, makeSection, sampleContent } from "@/lib/defaults";
import { sanitizeContent } from "@/lib/resumes";
import { contentSchema, resumePatchSchema } from "@/types/resume";

describe("formatting", () => {
  it("formats month values", () => {
    expect(formatMonth("2023-07")).toBe("Jul 2023");
    expect(formatMonth("Summer 2020")).toBe("Summer 2020");
  });

  it("formats date ranges", () => {
    expect(formatRange("2020-06", "2023-06", false)).toBe("Jun 2020 – Jun 2023");
    expect(formatRange("2023-07", "", true)).toBe("Jul 2023 – Present");
    expect(formatRange("", "", false)).toBe("");
  });

  it("detects empty rich text", () => {
    expect(hasText("<p></p>")).toBe(false);
    expect(hasText("<ul><li>Hi</li></ul>")).toBe(true);
  });
});

describe("content", () => {
  it("default and sample content pass validation", () => {
    expect(contentSchema.safeParse(blankContent()).success).toBe(true);
    expect(contentSchema.safeParse(sampleContent()).success).toBe(true);
  });

  it("rejects an empty name and unknown templates", () => {
    expect(resumePatchSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(resumePatchSchema.safeParse({ templateId: "fancy" }).success).toBe(false);
  });

  it("hides empty and hidden sections", () => {
    const s = makeSection("experience", "Work", 1);
    expect(isSectionVisible(s)).toBe(false);
    if (s.type === "experience") s.items[0].title = "Dev";
    expect(isSectionVisible(s)).toBe(true);
    expect(isSectionVisible({ ...s, hidden: true })).toBe(false);
  });

  it("sanitizes rich text to basic formatting", () => {
    const content = blankContent();
    const summary = content.sections.find((s) => s.type === "summary")!;
    if (summary.type === "summary") summary.html = '<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:x">link</a><strong>!</strong></p>';
    const clean = sanitizeContent(content).sections.find((s) => s.type === "summary")!;
    expect(clean.type === "summary" && clean.html).toBe("<p>Hi link<strong>!</strong></p>");
  });
});
