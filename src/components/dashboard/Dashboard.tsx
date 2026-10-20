"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { ResumeSummary } from "@/types/resume";
import { Button, Icon, IconButton } from "@/components/ui";
import { ResumeActions } from "./ResumeActions";

type View = "list" | "grid";
const VIEW_KEY = "resume-builder:view";

/** List/grid preference, remembered per browser; falls back to "list" when storage is unavailable. */
const viewListeners = new Set<() => void>();
const viewStore = {
  subscribe(cb: () => void) {
    viewListeners.add(cb);
    return () => void viewListeners.delete(cb);
  },
  get(): View {
    try {
      return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  },
  set(v: View) {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // storage unavailable; preference just isn't remembered
    }
    viewListeners.forEach((cb) => cb());
  },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export function Dashboard() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.get, () => "list" as View);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    api.list().then(setResumes, () => setError("Couldn’t load your resumes."));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const changeView = viewStore.set;

  const create = async (sample = false) => {
    setCreating(true);
    try {
      const doc = await api.create({ sample });
      router.push(`/resume/${doc.id}`);
    } catch {
      setError("Couldn’t create a resume.");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-6">
          <Icon name="file" className="h-5 w-5 text-blue-700" />
          <span className="font-bold tracking-tight">Resume Builder</span>
          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">local</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">My Resumes</h1>
          <div className="ml-auto flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5" role="group" aria-label="View">
            <IconButton icon="list" label="List view" aria-pressed={view === "list"} className={view === "list" ? "bg-neutral-100 text-neutral-900" : ""} onClick={() => changeView("list")} />
            <IconButton icon="grid" label="Grid view" aria-pressed={view === "grid"} className={view === "grid" ? "bg-neutral-100 text-neutral-900" : ""} onClick={() => changeView("grid")} />
          </div>
          <Button variant="primary" onClick={() => create(false)} disabled={creating}>
            <Icon name="plus" /> Create New Resume
          </Button>
        </div>

        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {resumes === null && !error && <p className="text-sm text-neutral-500">Loading…</p>}

        {resumes?.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <Icon name="file" className="mx-auto h-10 w-10 text-neutral-300" />
            <h2 className="mt-3 text-lg font-semibold">No resumes yet</h2>
            <p className="mt-1 text-sm text-neutral-500">Start from scratch or from a filled-in example.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="primary" onClick={() => create(false)} disabled={creating}>
                Create blank resume
              </Button>
              <Button onClick={() => create(true)} disabled={creating}>
                Start from example
              </Button>
            </div>
          </div>
        )}

        {resumes && resumes.length > 0 && view === "list" && (
          <div className="rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Modified</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Created</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {resumes.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/70" data-testid="resume-row">
                    <td className="px-4 py-3">
                      <Link href={`/resume/${r.id}`} className="font-semibold text-neutral-900 hover:text-blue-700">
                        {r.name}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{fmtDate(r.updatedAt)}</td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <ResumeActions resume={r} onChanged={refresh} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resumes && resumes.length > 0 && view === "grid" && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {resumes.map((r) => (
              <div key={r.id} className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white" data-testid="resume-card">
                <Link href={`/resume/${r.id}`} className="block border-b border-neutral-100 bg-neutral-100 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic local thumbnail */}
                  <img src={api.thumbnailUrl(r.id, r.updatedAt)} alt={`Preview of ${r.name}`} className="aspect-[210/297] w-full bg-white object-cover object-top shadow" loading="lazy" />
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <Link href={`/resume/${r.id}`} className="truncate font-semibold hover:text-blue-700">
                    {r.name}
                  </Link>
                  <div className="text-xs text-neutral-500">Modified {fmtDate(r.updatedAt)}</div>
                  <ResumeActions resume={r} onChanged={refresh} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
