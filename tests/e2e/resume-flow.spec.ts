import { expect, test } from "@playwright/test";

/** Create → edit (autosave) → reload → download PDF → delete, through the real UI. */
test("create, edit, download and delete a resume", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create New Resume" }).click();
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;

  // Rename via the toolbar.
  const name = `E2E Resume ${Date.now()}`;
  const nameInput = page.getByLabel("Resume name");
  await nameInput.fill(name);
  await nameInput.press("Enter");

  // Fill in the header; the preview updates live.
  await page.getByRole("button", { name: "Contact details" }).click();
  await page.getByLabel("First name").fill("Grace");
  await page.getByLabel("Last name").fill("Hopper");
  await page.getByLabel("Job title").fill("Rear Admiral");
  await expect(page.locator("[data-resume-page] .r-name")).toHaveText("Grace Hopper");

  // Add a skill to the Skills section.
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByLabel("Skill", { exact: true }).first().fill("COBOL");
  await expect(page.locator("[data-resume-page]")).toContainText("COBOL");

  // Autosave reaches the server.
  await expect(page.locator("[data-save-state]")).toHaveAttribute("data-save-state", "saved", { timeout: 10_000 });
  await page.reload();
  await expect(page.locator("[data-resume-page] .r-name")).toHaveText("Grace Hopper");

  // Add a structured certification: name and issuer are required, the rest optional.
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByRole("button", { name: "Certifications" }).click();
  const certName = page.getByRole("textbox", { name: "Name", exact: true });
  const issuer = page.getByLabel("Issuing organization");
  await certName.fill("Certified Kubernetes Administrator");
  await expect(page.getByText("Issuing organization is required")).toBeVisible();
  await issuer.fill("CNCF");
  await expect(page.getByText("Issuing organization is required")).toHaveCount(0);
  const issueDate = page.getByRole("group", { name: "Issue date" });
  await issueDate.getByLabel("Month").selectOption({ label: "March" });
  await issueDate.getByLabel("Year").selectOption("2024");
  const expiry = page.getByRole("group", { name: "Expiration date" });
  await expiry.getByLabel("Month").selectOption({ label: "March" });
  await expiry.getByLabel("Year").selectOption("2023");
  const expiryWarning = page.getByText("Expiration date can’t be earlier than the issue date.");
  await expect(expiryWarning).toBeVisible();
  await expiry.getByLabel("Year").selectOption("2027");
  await expect(expiryWarning).toHaveCount(0);
  await page.getByLabel("Credential ID").fill("LF-CKA-42");
  await expect(page.getByText("9/80")).toBeVisible();
  await page.getByLabel("Credential URL").fill("credly.com/badges/cka");

  const cert = page.locator("[data-resume-page] .r-section", { hasText: "Certified Kubernetes Administrator" });
  await expect(cert).toContainText("· CNCF");
  await expect(cert).toContainText("Issued Mar 2024 · Expires Mar 2027");
  await expect(cert).toContainText("Credential ID LF-CKA-42");
  await expect(cert.getByRole("link", { name: "Show credential" })).toHaveAttribute("href", "https://credly.com/badges/cka");

  await expect(page.locator("[data-save-state]")).toHaveAttribute("data-save-state", "saved", { timeout: 10_000 });
  await page.reload();
  await expect(page.locator("[data-resume-page]")).toContainText("Issued Mar 2024 · Expires Mar 2027");

  // Switch template from the Design panel.
  await page.getByRole("button", { name: "Design" }).click();
  await page.getByRole("button", { name: "Sidebar" }).click();
  await expect(page.locator(".t-sidebar")).toBeVisible();

  // Download from the editor.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${name}.pdf`);

  const pdf = await request.get(`/api/resumes/${id}/pdf`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // Back on the dashboard: it's listed first (most recently modified), then delete it.
  await page.getByRole("link", { name: "My Resumes" }).click();
  await page.getByRole("button", { name: "List view" }).click();
  const row = page.getByTestId("resume-row").filter({ hasText: name });
  await expect(page.getByTestId("resume-row").first()).toContainText(name);
  await row.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
  expect((await request.get(`/api/resumes/${id}`)).status()).toBe(404);
});
