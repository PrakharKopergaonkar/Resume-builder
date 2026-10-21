import type { ResumeDoc, ResumePatch, ResumeSummary } from "@/types/resume";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Sends the browser to the login page, returning here afterwards. */
export function redirectToLogin() {
  const next = window.location.pathname + window.location.search;
  window.location.assign(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    // The session expired or was cleared: go and sign in again.
    if (res.status === 401 && typeof window !== "undefined") redirectToLogin();
    throw new ApiError(res.status, `${init?.method ?? "GET"} ${url} failed: ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Browser-side client for the /api/resumes routes. */
export const api = {
  list: () => request<ResumeSummary[]>("/api/resumes"),
  get: (id: string) => request<ResumeDoc>(`/api/resumes/${id}`),
  create: (body: { name?: string; sample?: boolean } = {}) =>
    request<ResumeDoc>("/api/resumes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, patch: ResumePatch) =>
    request<ResumeDoc>(`/api/resumes/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  duplicate: (id: string) => request<ResumeDoc>(`/api/resumes/${id}/duplicate`, { method: "POST" }),
  remove: (id: string) => request<void>(`/api/resumes/${id}`, { method: "DELETE" }),
  pdfUrl: (id: string) => `/api/resumes/${id}/pdf`,
  docxUrl: (id: string) => `/api/resumes/${id}/docx`,
  jsonResumeUrl: (id: string) => `/api/resumes/${id}/json-resume`,
  thumbnailUrl: (id: string, version: string) => `/api/resumes/${id}/thumbnail?v=${encodeURIComponent(version)}`,
  printUrl: (id: string) => `/print/${id}?autoprint=1`,
};

export type CurrentUser = { id: string; name: string; email: string };
export type AuthResult = { ok: true; user: CurrentUser } | { ok: false; status: number; error: string; code?: string };

/** Auth calls report failures to the caller (e.g. a wrong password is not a reason to redirect). */
async function authRequest(url: string, body: unknown): Promise<AuthResult> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, user: data as CurrentUser };
    return { ok: false, status: res.status, error: data.error ?? "Something went wrong", code: data.code };
  } catch {
    return { ok: false, status: 0, error: "Something went wrong. Try again." };
  }
}

export const authApi = {
  signup: (body: { name: string; email: string; password: string }) => authRequest("/api/auth/signup", body),
  login: (body: { email: string; password: string }) => authRequest("/api/auth/login", body),
  logout: () => fetch("/api/auth/logout", { method: "POST" }),
  me: () => request<CurrentUser>("/api/auth/me"),
};

export type ImportResult =
  | { ok: true; resume: ResumeDoc; imported: string[]; skipped: string[] }
  | { ok: false; error: string };

/** Uploads a parsed JSON Resume file; answers with the new resume or a message to show the user. */
export async function importJsonResume(fileName: string, resume: unknown): Promise<ImportResult> {
  try {
    const res = await fetch("/api/resumes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, resume }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && typeof window !== "undefined") redirectToLogin();
    if (!res.ok) return { ok: false, error: data.error ?? "Couldn't import that file." };
    return { ok: true, resume: data.resume, imported: data.imported ?? [], skipped: data.skipped ?? [] };
  } catch {
    return { ok: false, error: "Couldn't import that file. Try again." };
  }
}

