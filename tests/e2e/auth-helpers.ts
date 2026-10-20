import { request, type APIRequestContext } from "@playwright/test";

export const STORAGE_STATE = "tests/e2e/.auth/user.json";
export const TEST_PASSWORD = "e2e-password-123";

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;

/** Signs up a fresh user through the API and returns a request context that carries their session cookie. */
export async function newUser(baseURL: string, name = "Test User"): Promise<{ api: APIRequestContext; email: string }> {
  const api = await request.newContext({ baseURL });
  const email = uniqueEmail("user");
  const res = await api.post("/api/auth/signup", { data: { name, email, password: TEST_PASSWORD } });
  if (!res.ok()) throw new Error(`sign-up failed: ${res.status()} ${await res.text()}`);
  return { api, email };
}

/** Deletes the account behind a request context (its resumes go with it). */
export async function deleteUser(api: APIRequestContext) {
  await api.delete("/api/auth/me");
  await api.dispose();
}
