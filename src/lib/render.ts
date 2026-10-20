import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { PAPER } from "@/lib/paper";
import { SESSION_COOKIE } from "@/lib/auth/session";
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

/**
 * Opens /print/[id] in headless Chrome. The print page fetches the resume from the authenticated API, so the
 * requesting user's own session token is set as a cookie on this page (callers have already checked ownership).
 */
async function withPrintPage<T>(origin: string, doc: ResumeDoc, sessionToken: string, fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.createBrowserContext(); // isolated cookie jar per render
  const page = await context.newPage();
  try {
    await context.setCookie({ name: SESSION_COOKIE, value: sessionToken, domain: new URL(origin).hostname, path: "/", httpOnly: true, sameSite: "Lax" });
    await page.goto(`${origin}/print/${doc.id}`, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.waitForSelector("[data-render-ready]", { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    return await fn(page);
  } finally {
    await context.close().catch(() => {});
  }
}

export async function renderPdf(origin: string, doc: ResumeDoc, sessionToken: string): Promise<Uint8Array> {
  return withPrintPage(origin, doc, sessionToken, (page) => page.pdf({ preferCSSPageSize: true, printBackground: true }));
}

const THUMB_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "thumbnails");
const THUMB_SCALE = 0.5;

async function renderThumbnail(origin: string, doc: ResumeDoc, sessionToken: string): Promise<Uint8Array> {
  const { widthPx, heightPx } = PAPER[doc.style.paper];
  return withPrintPage(origin, doc, sessionToken, async (page) => {
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
export async function getThumbnail(origin: string, doc: ResumeDoc, sessionToken: string): Promise<Uint8Array> {
  const version = new Date(doc.updatedAt).getTime();
  const file = path.join(THUMB_DIR, `${doc.id}-${version}.png`);
  try {
    return await fs.readFile(file);
  } catch {
    // cache miss
  }
  const png = await renderThumbnail(origin, doc, sessionToken);
  await clearThumbnail(doc.id);
  await fs.mkdir(THUMB_DIR, { recursive: true });
  await fs.writeFile(file, png);
  return png;
}

export async function clearThumbnail(id: string) {
  const files = await fs.readdir(THUMB_DIR).catch(() => [] as string[]);
  await Promise.all(files.filter((f) => f.startsWith(`${id}-`)).map((f) => fs.rm(path.join(THUMB_DIR, f), { force: true })));
}
