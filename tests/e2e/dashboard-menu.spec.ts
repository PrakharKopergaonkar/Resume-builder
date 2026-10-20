import { expect, test, type Page } from "@playwright/test";

let ids: string[] = [];

test.beforeEach(async ({ request }) => {
  // Several resumes so the grid is taller than the window and the last card's menu has to open upward.
  ids = [];
  for (let i = 0; i < 9; i++) {
    ids.push((await (await request.post("/api/resumes", { data: { name: `Menu test ${i}`, sample: true } })).json()).id);
  }
});

test.afterEach(async ({ request }) => {
  const all: { id: string; name: string }[] = await (await request.get("/api/resumes")).json();
  for (const r of all.filter((r) => r.name.startsWith("Menu test"))) await request.delete(`/api/resumes/${r.id}`);
});

/** The menu is fully inside the window and is the topmost element at its center (not clipped by a card). */
async function expectMenuUsable(page: Page) {
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[role=menu]") !== null, [box.x + box.width / 2, box.y + box.height / 2]);
  expect(onTop).toBe(true);
}

test.use({ viewport: { width: 1280, height: 700 } });

test("the More menu works in the grid view, including the last card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grid view" }).click();
  const cards = page.getByTestId("resume-card");
  await expect(cards.first()).toBeVisible();

  // first card: opens, is on top, and closes on Escape and on an outside click
  await cards.first().getByRole("button", { name: "More" }).click();
  await expectMenuUsable(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await cards.first().getByRole("button", { name: "More" }).click();
  await page.getByRole("heading", { name: "My Resumes" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);

  // a card near the bottom of the page (the oldest of our test resumes): its menu must flip upward and stay on screen.
  // Only our own "Menu test" resumes are touched, never other resumes in the list.
  const last = cards.filter({ hasText: "Menu test 0" }).first();
  await last.scrollIntoViewIfNeeded();
  await last.getByRole("button", { name: "More" }).click();
  await expectMenuUsable(page);

  // an action works from the portal menu: Duplicate adds a card
  const before = await cards.count();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(cards).toHaveCount(before + 1);
  await expect(page.getByRole("menu")).toHaveCount(0);

  // scrolling closes the menu instead of leaving it floating
  await cards.first().getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.mouse.wheel(0, 300);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("the More menu still works in the list view", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "List view" }).click();
  const row = page.getByTestId("resume-row").filter({ hasText: "Menu test 3" });
  await row.getByRole("button", { name: "More" }).click();
  await expectMenuUsable(page);
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await expect(page.getByRole("dialog", { name: "Rename resume" })).toBeVisible();
});
