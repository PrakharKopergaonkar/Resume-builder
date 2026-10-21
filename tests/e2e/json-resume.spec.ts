import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
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

const sample = readFileSync(path.resolve(__dirname, "../fixtures/json-resume.sample.json"));

test("export a resume as JSON Resume, then import it back as a new resume", async ({ page }) => {
  const created = await page.request.post("/api/resumes", { data: { name: "JSON export test", sample: true } });
  const { id } = await created.json();
  await page.goto(`/resume/${id}`);

  // Export from the editor's Download menu.
  await page.getByRole("button", { name: "Download" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "JSON Resume (.json)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("JSON export test.json");
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(exported.$schema).toContain("jsonresume");
  expect(exported.basics.name).toBeTruthy();
  expect(exported.work.length).toBeGreaterThan(0);

  // Import that file from the dashboard: it opens as a new resume with the same person.
  await page.goto("/");
  await page.getByLabel("JSON Resume file").setInputFiles({ name: "exported.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+$/);
  const importedId = page.url().split("/").pop()!;
  expect(importedId).not.toBe(id);
  await expect(page.locator("[data-resume-page] .r-name")).toHaveText(exported.basics.name);

  await page.request.delete(`/api/resumes/${id}`);
  await page.request.delete(`/api/resumes/${importedId}`);
});

test("importing the official sample reports the sections it skipped", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("JSON Resume file").setInputFiles({ name: "richard.json", mimeType: "application/json", buffer: sample });
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+\?skipped=/);
  const notice = page.getByRole("status").filter({ hasText: "were skipped" });
  await expect(notice).toContainText("Volunteer");
  await expect(notice).toContainText("References");
  await expect(page.locator("[data-resume-page]")).toContainText("Pied Piper");

  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(notice).toHaveCount(0);
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+$/);
  await page.request.delete(`/api/resumes/${page.url().split("/").pop()}`);
});

test("importing a file that isn't JSON Resume shows a clear error", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("JSON Resume file");

  await input.setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from("not json at all") });
  await expect(page.getByText("That file isn't valid JSON.")).toBeVisible();

  await input.setInputFiles({ name: "package.json", mimeType: "application/json", buffer: Buffer.from('{"name":"x","version":"1.0.0"}') });
  await expect(page.getByText("This doesn't look like a JSON Resume file")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
