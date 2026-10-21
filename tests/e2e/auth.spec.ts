import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { deleteUser, newUser, openDatabase, TEST_PASSWORD, uniqueEmail } from "./auth-helpers";

// These tests manage their own sessions: start every page signed out.
test.use({ storageState: { cookies: [], origins: [] } });

const baseURL = () => test.info().project.use.baseURL!;

async function fillSignup(page: Page, v: { name: string; email: string; password: string; confirm?: string }) {
  await page.getByLabel("Full name").fill(v.name);
  await page.getByLabel("Email").fill(v.email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(v.password);
  await page.getByRole("textbox", { name: "Confirm password" }).fill(v.confirm ?? v.password);
}

async function logInViaUi(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Removes an account that was created through the UI (signs in with its credentials, then deletes it). */
async function cleanupAccount(email: string) {
  const api = await request.newContext({ baseURL: baseURL() });
  const res = await api.post("/api/auth/login", { data: { email, password: TEST_PASSWORD } });
  if (res.ok()) await deleteUser(api);
  else await api.dispose();
}

test("sign up starts you on the dashboard with a prefilled sample resume", async ({ page }) => {
  const email = uniqueEmail("signup");
  await page.goto("/signup");
  await expect(page).toHaveTitle("Create account · Resume Builder");
  await fillSignup(page, { name: "Ada Lovelace", email, password: TEST_PASSWORD });

  // Double submit must create one account only.
  let signupRequests = 0;
  page.on("request", (r) => r.url().endsWith("/api/auth/signup") && signupRequests++);
  const submit = page.getByRole("button", { name: "Create account" });
  await submit.dblclick();

  await expect(page).toHaveURL(/\/$/);
  expect(signupRequests).toBe(1);
  await expect(page.getByText("Ada Lovelace")).toBeVisible(); // header
  const rows = page.getByTestId("resume-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Sample Resume");

  await rows.first().getByRole("link", { name: "Edit" }).click();
  await expect(page.locator("[data-resume-page] .r-name")).toHaveText("Ada Lovelace");
  await expect(page.locator("[data-resume-page]")).toContainText("Work History".toUpperCase(), { ignoreCase: true });
  await expect(page.locator("[data-resume-page]")).toContainText("Languages", { ignoreCase: true });

  await cleanupAccount(email);
});

test("sign-up form errors: mismatched or short passwords and a taken email", async ({ page }) => {
  const { api, email: taken } = await newUser(baseURL());
  await page.goto("/signup");

  let calls = 0;
  page.on("request", (r) => r.url().endsWith("/api/auth/signup") && calls++);

  await fillSignup(page, { name: "Short", email: uniqueEmail("short"), password: "abc", confirm: "abd" });
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("At least 8 characters").first()).toBeVisible();
  await expect(page.getByText("Passwords don't match")).toBeVisible();
  expect(calls).toBe(0); // blocked before submitting
  await expect(page.getByRole("textbox", { name: "Password", exact: true })).toBeFocused();

  await fillSignup(page, { name: "Dup", email: taken, password: TEST_PASSWORD });
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists.")).toBeVisible();
  const loginInstead = page.getByRole("link", { name: "Log in instead?" });
  await expect(loginInstead).toHaveAttribute("href", new RegExp(`email=${encodeURIComponent(taken)}`));
  await loginInstead.click();
  await expect(page.getByLabel("Email")).toHaveValue(taken);

  await deleteUser(api);
});

test("log out, wrong password, then log in again", async ({ page }) => {
  const { api, email } = await newUser(baseURL(), "Grace Hopper");
  await page.context().addCookies((await api.storageState()).cookies);
  await page.goto("/");
  await expect(page.getByText("Grace Hopper")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/); // really signed out

  await logInViaUi(page, email, "wrong-password");
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toHaveText("Email or password is incorrect.");
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await logInViaUi(page, email, TEST_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Grace Hopper")).toBeVisible();

  await deleteUser(api);
});

test("signed-out visitors are sent to log in, and come back afterwards", async ({ page }) => {
  const { api, email } = await newUser(baseURL());
  const [resume] = await (await api.get("/api/resumes")).json();

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle("Log in · Resume Builder");

  await page.goto(`/resume/${resume.id}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/resume/${resume.id}`)}`));
  await logInViaUi(page, email, TEST_PASSWORD);
  await expect(page).toHaveURL(new RegExp(`/resume/${resume.id}$`));
  await expect(page.getByTestId("form-panel")).toBeVisible();

  // Signed in, the auth pages bounce back to the dashboard.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  await deleteUser(api);
});

test("the API: 401 without a valid session, 404 for someone else's resume", async () => {
  const a = await newUser(baseURL(), "Owner A");
  const b = await newUser(baseURL(), "Other B");
  const anon = await request.newContext({ baseURL: baseURL() });
  const forged = await request.newContext({ baseURL: baseURL(), extraHTTPHeaders: { cookie: "session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad" } });

  const resume = await (await a.api.post("/api/resumes", { data: { name: "A private resume" } })).json();
  const url = `/api/resumes/${resume.id}`;

  for (const ctx of [anon, forged]) {
    expect((await ctx.get("/api/resumes")).status()).toBe(401);
    expect((await ctx.get(url)).status()).toBe(401);
    expect((await ctx.get(`${url}/docx`)).status()).toBe(401);
    expect((await ctx.get(`${url}/json-resume`)).status()).toBe(401);
    expect((await ctx.post("/api/resumes/import", { data: { resume: { basics: { name: "X" } } } })).status()).toBe(401);
    expect((await ctx.get("/api/auth/me")).status()).toBe(401);
  }

  const asB: [string, () => Promise<{ status(): number }>][] = [
    ["GET", () => b.api.get(url)],
    ["PATCH", () => b.api.patch(url, { data: { name: "hijacked" } })],
    ["DELETE", () => b.api.delete(url)],
    ["duplicate", () => b.api.post(`${url}/duplicate`)],
    ["pdf", () => b.api.get(`${url}/pdf`)],
    ["docx", () => b.api.get(`${url}/docx`)],
    ["json-resume", () => b.api.get(`${url}/json-resume`)],
    ["thumbnail", () => b.api.get(`${url}/thumbnail`)],
  ];
  for (const [what, call] of asB) expect((await call()).status(), what).toBe(404);

  const bList: { id: string }[] = await (await b.api.get("/api/resumes")).json();
  expect(bList.map((r) => r.id)).not.toContain(resume.id);

  // A's resume is untouched and still fully usable by A, including the PDF.
  const again = await (await a.api.get(url)).json();
  expect(again.name).toBe("A private resume");
  const pdf = await a.api.get(`${url}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await Promise.all([anon.dispose(), forged.dispose()]);
  await deleteUser(a.api);
  await deleteUser(b.api);
});

test("login rejects unknown emails with the same message as wrong passwords", async () => {
  const api: APIRequestContext = await request.newContext({ baseURL: baseURL() });
  const res = await api.post("/api/auth/login", { data: { email: uniqueEmail("nobody"), password: TEST_PASSWORD } });
  expect(res.status()).toBe(401);
  expect((await res.json()).error).toBe("Email or password is incorrect");
  await api.dispose();
});

test("a session whose account no longer exists is cleared instead of looping between pages", async ({ page }) => {
  const email = uniqueEmail("removed");
  const signup = await page.request.post("/api/auth/signup", { data: { name: "Removed", email, password: TEST_PASSWORD } });
  expect(signup.status()).toBe(201);
  const db = openDatabase();
  db.prepare("DELETE FROM User WHERE email = ?").run(email);
  db.close();

  const res = await page.request.get("/api/auth/me");
  expect(res.status()).toBe(401);
  expect(res.headers()["set-cookie"]).toMatch(/session=;.*Max-Age=0/i);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
