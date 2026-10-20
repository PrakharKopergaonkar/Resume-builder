import { expect, test, type Page } from "@playwright/test";

const theme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const pageBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const toggle = (page: Page) => page.getByRole("button", { name: "Dark theme" });

let id: string;
test.beforeAll(async ({ request }) => {
  id = (await (await request.post("/api/resumes", { data: { name: "Theme test", sample: true } })).json()).id;
});
test.afterAll(async ({ request }) => {
  await request.delete(`/api/resumes/${id}`);
});

test.describe("dark OS", () => {
  test.use({ colorScheme: "dark" });

  test("a first visit follows the OS and the toggle reflects it", async ({ page }) => {
    await page.goto("/");
    expect(await theme(page)).toBe("dark");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    expect(await pageBg(page)).not.toBe("rgb(245, 246, 248)");
  });

  test("a stored light choice overrides the OS", async ({ page }) => {
    await page.goto("/");
    await toggle(page).click();
    expect(await theme(page)).toBe("light");
    await page.reload();
    expect(await theme(page)).toBe("light");
    expect(await pageBg(page)).toBe("rgb(245, 246, 248)");
  });
});

test.describe("light OS", () => {
  test.use({ colorScheme: "light" });

  test("toggling switches theme, persists across reloads, and can be undone", async ({ page }) => {
    await page.goto("/");
    expect(await theme(page)).toBe("light");
    await toggle(page).click();
    expect(await theme(page)).toBe("dark");
    expect(await page.evaluate(() => localStorage.getItem("resume-builder:theme"))).toBe("dark");
    await page.reload();
    expect(await theme(page)).toBe("dark");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    await toggle(page).click();
    await page.reload();
    expect(await theme(page)).toBe("light");
  });

  test("works in the editor, and the resume paper stays white in dark", async ({ page }) => {
    await page.goto(`/resume/${id}`);
    await expect(page.getByTestId("form-panel")).toBeVisible();
    await toggle(page).click();
    expect(await theme(page)).toBe("dark");
    const paper = await page.locator("[data-resume-page]").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(paper).toBe("rgb(255, 255, 255)");
    const panel = await page.getByTestId("form-panel").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(panel).not.toBe("rgb(250, 250, 250)");
  });

  test("the theme is applied before the page paints (no flash)", async ({ page, request }) => {
    const html = await (await request.get("/")).text();
    const script = html.indexOf("localStorage.getItem");
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(html.indexOf("<body"));
    await page.addInitScript(() => localStorage.setItem("resume-builder:theme", "dark"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(await theme(page)).toBe("dark");
  });

  test("print pages stay light even when dark is chosen", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("resume-builder:theme", "dark"));
    await page.goto(`/print/${id}`);
    await expect(page.locator("[data-render-ready]")).toBeVisible();
    expect(await theme(page)).toBe("light");
    const sheet = await page.locator("[data-resume-page]").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(sheet).toBe("rgb(255, 255, 255)");
    const root = await page.locator("[data-render-ready]").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(root).not.toBe("rgb(20, 20, 20)");
    expect((await page.request.get(`/api/resumes/${id}/pdf`)).headers()["content-type"]).toBe("application/pdf");
  });
});
