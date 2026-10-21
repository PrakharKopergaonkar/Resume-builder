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

  // an action works from the portal menu: Duplicate adds a card (counted among our own, since other specs
  // running in parallel add and remove resumes in the same account)
  const ours = cards.filter({ hasText: "Menu test" });
  const before = await ours.count();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(ours).toHaveCount(before + 1);
  await expect(page.getByRole("menu")).toHaveCount(0);

  // the menu stays attached to its button while the page scrolls, and closes once the button leaves the screen
  await page.evaluate(() => window.scrollTo(0, 0));
  const firstMore = cards.first().getByRole("button", { name: "More" });
  await firstMore.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.evaluate(() => window.scrollBy(0, 40));
  // Still 4px from its button, on whichever side it opened (below, or above when there's no room below).
  await expect
    .poll(async () => {
      const m = (await page.getByRole("menu").boundingBox())!;
      const b = (await firstMore.boundingBox())!;
      const below = m.y - (b.y + b.height);
      const above = b.y - (m.y + m.height);
      return Math.min(Math.abs(below - 4), Math.abs(above - 4));
    })
    .toBeLessThanOrEqual(2);
  await page.evaluate(() => window.scrollBy(0, 2000));
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

test("Download offers PDF and Word from a grid card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grid view" }).click();
  const card = page.getByTestId("resume-card").filter({ hasText: "Menu test 4" }).first();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Download" }).click();
  await expectMenuUsable(page);
  await expect(page.getByRole("menuitem")).toHaveText(["PDF", "Word (.docx)", "JSON Resume (.json)"]);

  const wordPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Word (.docx)" }).click();
  const word = await wordPromise;
  expect(word.suggestedFilename()).toBe("Menu test 4.docx");

  const pdfPromise = page.waitForEvent("download");
  await card.getByRole("button", { name: "Download" }).click();
  await page.getByRole("menuitem", { name: "PDF" }).click();
  expect((await pdfPromise).suggestedFilename()).toBe("Menu test 4.pdf");
});
