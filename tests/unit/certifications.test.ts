import { describe, expect, it } from "vitest";
import { formatMonthYear, normalizeUrl } from "@/components/renderer/format";
import { certificationDates, isSectionVisible } from "@/components/renderer/sections";
import { emptyCertification, makeSection } from "@/lib/defaults";
import { migrateContent } from "@/lib/migrate";
import { sanitizeContent } from "@/lib/resumes";
import { contentSchema, type ResumeContent, type Section } from "@/types/resume";

const header = { firstName: "", lastName: "", title: "", email: "", phone: "", city: "", country: "", links: [] };

describe("certification formatting", () => {
  it("formats month/year pairs", () => {
    expect(formatMonthYear(3, "2024")).toBe("Mar 2024");
    expect(formatMonthYear(0, "2024")).toBe("2024");
    expect(formatMonthYear(5, "")).toBe("");
  });

  it("describes issue and expiration dates", () => {
    const c = { ...emptyCertification(), issueMonth: 9, issueYear: "2024" };
    expect(certificationDates(c)).toBe("Issued Sep 2024 · No expiration");
    expect(certificationDates({ ...c, expiryMonth: 9, expiryYear: "2027" })).toBe("Issued Sep 2024 · Expires Sep 2027");
    expect(certificationDates(emptyCertification())).toBe("");
  });

  it("shows the section once an entry has a name", () => {
    const s = makeSection("certifications", "Certifications", 1);
    expect(isSectionVisible(s)).toBe(false);
    if (s.type === "certifications") s.items[0].name = "CKA";
    expect(isSectionVisible(s)).toBe(true);
  });

  it("keeps half-filled entries valid so they can autosave", () => {
    const content: ResumeContent = { header, sections: [makeSection("certifications", "Certifications", 1)] };
    expect(contentSchema.safeParse(content).success).toBe(true);
  });

  it("rejects credential IDs over 80 characters", () => {
    const s = makeSection("certifications", "Certifications", 1);
    if (s.type === "certifications") s.items[0].credentialId = "x".repeat(81);
    expect(contentSchema.safeParse({ header, sections: [s] }).success).toBe(false);
  });
});

describe("credential URLs", () => {
  it("normalizes and rejects unsafe schemes", () => {
    expect(normalizeUrl("https://credly.com/x")).toBe("https://credly.com/x");
    expect(normalizeUrl("credly.com/x")).toBe("https://credly.com/x");
    expect(normalizeUrl("javascript:alert(1)")).toBe("");
    expect(normalizeUrl("  ")).toBe("");
  });

  it("is applied by sanitizeContent", () => {
    const s = makeSection("certifications", "Certifications", 1);
    if (s.type === "certifications") s.items[0].credentialUrl = "javascript:alert(1)";
    const out = sanitizeContent({ header, sections: [s] }).sections[0];
    expect(out.type === "certifications" && out.items[0].credentialUrl).toBe("");
  });
});

describe("migration from custom sections", () => {
  const custom = (html = ""): Section => ({
      id: "s1",
      type: "custom",
      title: "Certifications",
      hidden: false,
      column: 0,
      items: [{ id: "i1", heading: "AWS Developer", date: "2024-03", html }],
    });

  it("converts a custom Certifications section", () => {
    const [s] = migrateContent({ header, sections: [custom()] }).sections;
    expect(s.type).toBe("certifications");
    expect(s.type === "certifications" && s.items[0]).toMatchObject({ id: "i1", name: "AWS Developer", issueYear: "2024", issueMonth: 3, issuer: "" });
    expect(s.column).toBe(0);
  });

  it("leaves sections with description text alone", () => {
    const content = { header, sections: [custom("<p>Details</p>")] };
    expect(migrateContent(content)).toBe(content);
  });
});
