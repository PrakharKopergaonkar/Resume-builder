import type { ResumeDoc, ResumePatch, ResumeSummary } from "@/types/resume";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} failed: ${res.status}`);
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
  thumbnailUrl: (id: string, version: string) => `/api/resumes/${id}/thumbnail?v=${encodeURIComponent(version)}`,
  printUrl: (id: string) => `/print/${id}?autoprint=1`,
};
