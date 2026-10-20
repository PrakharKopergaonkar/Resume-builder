import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { PAPER } from "@/lib/paper";
import type { ResumeDoc } from "@/types/resume";

/**
 * Server-side rendering of resumes through headless Chrome. Both the PDF and the
 * dashboard thumbnail load /print/[id], which uses the same <ResumeRenderer> as the
 * editor preview, so all three outputs match.
 */

const globalForBrowser = globalThis as unknown as { browser?: Promise<Browser> };

async function getBrowser(): Promise<Browser> {
  const existing = globalForBrowser.browser && (await globalForBrowser.browser.catch(() => undefined));
  if (existing?.connected) return existing;

  const launching = puppeteer.launch({ headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
  globalForBrowser.browser = launching;
  const browser = await launching;
  browser.on("disconnected", () => {
    if (globalForBrowser.browser === launching) globalForBrowser.browser = undefined;
  });
  return browser;
}

async function withPrintPage<T>(origin: string, doc: ResumeDoc, fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/print/${doc.id}`, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.waitForSelector("[data-render-ready]", { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function renderPdf(origin: string, doc: ResumeDoc): Promise<Uint8Array> {
  return withPrintPage(origin, doc, (page) => page.pdf({ preferCSSPageSize: true, printBackground: true }));
}

const THUMB_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "thumbnails");
const THUMB_SCALE = 0.5;

async function renderThumbnail(origin: string, doc: ResumeDoc): Promise<Uint8Array> {
  const { widthPx, heightPx } = PAPER[doc.style.paper];
  return withPrintPage(origin, doc, async (page) => {
    await page.setViewport({ width: Math.ceil(widthPx), height: Math.ceil(heightPx), deviceScaleFactor: THUMB_SCALE });
    const sheet = await page.$("[data-resume-page]");
    const box = await sheet?.boundingBox();
    return page.screenshot({
      type: "png",
      clip: { x: box?.x ?? 0, y: box?.y ?? 0, width: widthPx, height: heightPx },
    });
  });
}

/** Returns a cached first-page PNG, re-rendering when the resume changed since it was cached. */
export async function getThumbnail(origin: string, doc: ResumeDoc): Promise<Uint8Array> {
  const version = new Date(doc.updatedAt).getTime();
  const file = path.join(THUMB_DIR, `${doc.id}-${version}.png`);
  try {
    return await fs.readFile(file);
  } catch {
    // cache miss
  }
  const png = await renderThumbnail(origin, doc);
  await clearThumbnail(doc.id);
  await fs.mkdir(THUMB_DIR, { recursive: true });
  await fs.writeFile(file, png);
  return png;
}

export async function clearThumbnail(id: string) {
  const files = await fs.readdir(THUMB_DIR).catch(() => [] as string[]);
  await Promise.all(files.filter((f) => f.startsWith(`${id}-`)).map((f) => fs.rm(path.join(THUMB_DIR, f), { force: true })));
}
