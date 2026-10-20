import { expect, test } from "@playwright/test";

test.describe("resizable panels", () => {
  let id: string;

  test.beforeEach(async ({ page, request }) => {
    const res = await request.post("/api/resumes", { data: { name: "Resize test", sample: true } });
    id = (await res.json()).id;
    await page.goto(`/resume/${id}`);
    await page.evaluate(() => localStorage.removeItem("resume-builder:left-width"));
    await page.reload();
    await expect(page.getByTestId("form-panel")).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/resumes/${id}`);
  });

  const width = async (page: import("@playwright/test").Page) =>
    Math.round((await page.getByTestId("form-panel").boundingBox())!.width);

  /** Drags the separator horizontally by `dx` px with the real mouse. */
  async function drag(page: import("@playwright/test").Page, dx: number) {
    const box = (await page.getByRole("separator", { name: "Resize panels" }).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 8 });
    await page.mouse.up();
  }

  test("drags within limits, keeps the preview usable, and remembers the width", async ({ page }) => {
    expect(await width(page)).toBe(440);

    await drag(page, 150);
    await expect.poll(() => width(page)).toBeGreaterThan(570);
    expect(await width(page)).toBeLessThan(610);
    expect(await page.evaluate(() => getSelection()?.toString())).toBe("");

    await drag(page, 2000);
    await expect.poll(() => width(page)).toBeLessThanOrEqual(720);
    const viewport = page.viewportSize()!;
    const preview = (await page.locator("main").boundingBox())!;
    expect(preview.width).toBeGreaterThanOrEqual(420 - 1);
    expect(preview.x + preview.width).toBeLessThanOrEqual(viewport.width + 1);

    await drag(page, -2000);
    await expect.poll(() => width(page)).toBe(320);

    await drag(page, 100);
    const chosen = await expect.poll(() => width(page)).toBeGreaterThan(400).then(() => width(page));
    await page.reload();
    await expect(page.getByTestId("form-panel")).toBeVisible();
    expect(await width(page)).toBe(chosen);
  });

  test("keyboard arrows resize and double-click resets", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize panels" });
    await separator.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => width(page)).toBe(456);
    await page.keyboard.press("Shift+ArrowLeft");
    await expect.poll(() => width(page)).toBe(392);
    await page.keyboard.press("Home");
    await expect.poll(() => width(page)).toBe(320);
    await expect(separator).toHaveAttribute("aria-valuenow", "320");

    await separator.dblclick();
    await expect.poll(() => width(page)).toBe(440);
  });
});
