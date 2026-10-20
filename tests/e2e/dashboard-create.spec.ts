import { expect, test } from "@playwright/test";

test("Create New Resume is usable again after going back from the editor", async ({ page, request }) => {
  await page.goto("/");
  const create = page.getByRole("button", { name: "Create New Resume" });
  const rows = page.getByTestId("resume-row");
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();

  await create.click();
  await expect(create).toBeDisabled(); // no double-create while it is working
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+$/);
  const firstId = page.url().split("/").pop()!;
  await expect(page.getByTestId("form-panel")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(create).toBeEnabled();
  await expect(rows).toHaveCount(before + 1); // the new resume shows up without a manual refresh

  // and it works a second time
  await create.click();
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]+$/);
  const secondId = page.url().split("/").pop()!;
  expect(secondId).not.toBe(firstId);

  for (const id of [firstId, secondId]) await request.delete(`/api/resumes/${id}`);
});
