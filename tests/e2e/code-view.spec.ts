import { expect, test, type Page } from "@playwright/test";
import { TEST_PASSWORD, uniqueEmail } from "./auth-helpers";

/** Each test signs up its own throwaway account (so it never touches the shared dashboard), removed afterwards. */
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/auth/signup", { data: { name: "Grace Hopper", email: uniqueEmail("isolated"), password: TEST_PASSWORD } });
  expect(res.status()).toBe(201);
});
test.afterEach(async ({ page }) => {
  await page.request.delete("/api/auth/me");
});

/** A small but complete resume as YAML; `first` and `start` vary per step. */
const resumeYaml = ({ first = "Grace", start = "1943-07" } = {}) => `name: Code view test
design:
  template: classic
header:
  firstName: ${first}
  lastName: Hopper
  title: Rear Admiral
  email: grace@example.com
sections:
  - type: summary
    title: Summary
    text: |-
      Computer scientist.
      - Wrote the **first** compiler
      - Popularized *debugging*
  - type: experience
    title: Work History
    items:
      - title: Programmer
        company: US Navy
        start: ${start}
        end: 1986-08
  - type: skills
    title: Skills
    column: left
    items:
      - COBOL wizard
      - name: Mathematics
        level: 5
`;

const name = (page: Page) => page.locator("[data-resume-page] .r-name");
const codeText = (page: Page) => page.getByRole("textbox", { name: "Resume as YAML" });

async function openCodeTab(page: Page) {
  await page.getByRole("navigation", { name: "Editor tools" }).getByRole("button", { name: "Code" }).click();
  await expect(codeText(page)).toBeVisible({ timeout: 15_000 });
}

/** Replaces the whole YAML text, as if pasted. */
async function replaceYaml(page: Page, text: string) {
  await codeText(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(text);
}

test("edit a resume as YAML: live preview, errors, undo, and sync with the forms", async ({ page }) => {
  const created = await page.request.post("/api/resumes", { data: { name: "Code view test" } });
  const { id } = await created.json();
  await page.goto(`/resume/${id}`);
  await openCodeTab(page);

  // A valid edit applies to the preview and autosaves.
  await replaceYaml(page, resumeYaml());
  await expect(name(page)).toHaveText("Grace Hopper");
  const preview = page.locator("[data-resume-page]");
  await expect(preview).toContainText("COBOL wizard");
  await expect(preview.locator("li strong", { hasText: "first" })).toBeVisible();
  await expect(page.locator("[data-status]")).toHaveAttribute("data-status", "valid");
  await expect(page.locator("[data-save-state]")).toHaveAttribute("data-save-state", "saved", { timeout: 10_000 });
  await page.reload();
  await expect(name(page)).toHaveText("Grace Hopper");

  // Invalid YAML shows where the problem is and never touches the resume.
  await openCodeTab(page);
  await replaceYaml(page, resumeYaml({ first: "Ada", start: "July 1943" }));
  await expect(page.locator("[data-status]")).toHaveAttribute("data-status", "invalid");
  const errors = page.getByRole("list", { name: "YAML errors" });
  await expect(errors).toContainText(/Line 21: sections\[1\]\.items\[0\]\.start: expected a month like 2023-07/);
  await expect(page.locator(".cm-lint-marker-error")).toBeVisible();
  await expect(name(page)).toHaveText("Grace Hopper");

  // Fixing it applies; undo reverts it and the YAML follows.
  await replaceYaml(page, resumeYaml({ first: "Ada" }));
  await expect(name(page)).toHaveText("Ada Hopper");
  await page.getByRole("button", { name: "Undo (⌘Z)" }).click();
  await expect(name(page)).toHaveText("Grace Hopper");
  await expect(codeText(page)).toContainText("firstName: Grace");

  // Reset throws away invalid text.
  await replaceYaml(page, "name: [unclosed");
  await expect(page.locator("[data-status]")).toHaveAttribute("data-status", "invalid");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("[data-status]")).toHaveAttribute("data-status", "valid");
  await expect(codeText(page)).toContainText("firstName: Grace");

  // A form edit shows up in the YAML.
  await page.getByRole("navigation", { name: "Editor tools" }).getByRole("button", { name: "Content" }).click();
  await page.getByRole("button", { name: "Contact details" }).click();
  await page.getByLabel("Job title").fill("Admiral");
  await openCodeTab(page);
  await expect(codeText(page)).toContainText("title: Admiral");

  await page.request.delete(`/api/resumes/${id}`);
});

test("the YAML editor suggests allowed keys and values, and flags unknown keys", async ({ page }) => {
  const created = await page.request.post("/api/resumes", { data: { name: "Code view test" } });
  const { id } = await created.json();
  await page.goto(`/resume/${id}`);
  await openCodeTab(page);
  await replaceYaml(page, resumeYaml());
  await expect(name(page)).toHaveText("Grace Hopper");

  // A new list item under "sections:" offers the section keys; picking "type" then shows the section types.
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("  - ");
  const popup = page.locator(".cm-tooltip-autocomplete");
  await expect(popup.getByRole("option").first()).toContainText("type");
  await page.keyboard.press("Enter");
  await expect(popup.getByRole("option")).toHaveText([/summary/, /experience/, /education/, /skills/, /certifications/, /custom/]);
  await page.keyboard.type("cus");
  await expect(popup.getByRole("option")).toHaveText([/custom/]);
  await page.waitForTimeout(150); // CodeMirror ignores Enter for ~75 ms after the list updates (interactionDelay)
  await page.keyboard.press("Enter");
  await expect(codeText(page)).toContainText("- type: custom");

  // Keys inside an experience item: only job fields, minus the ones already there.
  await replaceYaml(page, `${resumeYaml().split("  - type: skills")[0]}        `);
  await page.keyboard.type("c");
  const options = popup.getByRole("option");
  await expect(options.first()).toBeVisible();
  const offered = (await options.allTextContents()).map((t) => t.split(/\s/)[0]);
  expect(offered).toEqual(expect.arrayContaining(["city", "country", "current"]));
  expect(offered).not.toContain("company"); // already used in this item
  expect(offered).not.toContain("school"); // an education field
  await page.keyboard.press("Escape");

  // A misspelled key is ignored, and says so.
  await replaceYaml(page, resumeYaml().replace("company:", "compnay:"));
  await expect(page.locator("[data-status]")).toContainText("1 ignored key");
  await expect(page.getByRole("list", { name: "YAML warnings" })).toContainText(`Line 20: "compnay" isn't a field here, so it's ignored. Did you mean "company"?`);

  await page.request.delete(`/api/resumes/${id}`);
});
