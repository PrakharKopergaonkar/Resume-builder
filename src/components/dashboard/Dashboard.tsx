"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { api } from "@/lib/api";
import type { ResumeSummary } from "@/types/resume";
import { Button, Icon, IconButton } from "@/components/ui";
import { cx } from "@/lib/cx";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./Dashboard.module.scss";
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
  // True while the page navigates to the new resume. A transition clears itself once navigation finishes, so
  // the buttons are enabled again when you come back (the dashboard stays mounted while you are in the editor).
  const [navigating, startNavigation] = useTransition();
  const busy = creating || navigating;

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
      startNavigation(() => router.push(`/resume/${doc.id}`));
    } catch {
      setError("Couldn’t create a resume.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Icon name="file" size="md" className={styles.logo} />
          <span className={styles.brand}>Resume Builder</span>
          <span className={styles.localBadge}>local</span>
          <div className={styles.topBarEnd}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.heading}>
          <h1 className={styles.title}>My Resumes</h1>
          <div className={styles.viewToggle} role="group" aria-label="View">
            <IconButton icon="list" label="List view" aria-pressed={view === "list"} active={view === "list"} onClick={() => changeView("list")} />
            <IconButton icon="grid" label="Grid view" aria-pressed={view === "grid"} active={view === "grid"} onClick={() => changeView("grid")} />
          </div>
          <Button variant="primary" onClick={() => create(false)} disabled={busy}>
            <Icon name="plus" /> Create New Resume
          </Button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {resumes === null && !error && <p className={styles.loading}>Loading…</p>}

        {resumes?.length === 0 && (
          <div className={styles.empty}>
            <Icon name="file" size="xl" className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No resumes yet</h2>
            <p className={styles.emptyHint}>Start from scratch or from a filled-in example.</p>
            <div className={styles.emptyActions}>
              <Button variant="primary" onClick={() => create(false)} disabled={busy}>
                Create blank resume
              </Button>
              <Button onClick={() => create(true)} disabled={busy}>
                Start from example
              </Button>
            </div>
          </div>
        )}

        {resumes && resumes.length > 0 && view === "list" && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.headCell}>Name</th>
                  <th className={cx(styles.headCell, styles.wideOnly)}>Modified</th>
                  <th className={cx(styles.headCell, styles.wideOnly)}>Created</th>
                  <th className={cx(styles.headCell, styles.alignRight)}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.id} data-testid="resume-row">
                    <td className={styles.cell}>
                      <Link href={`/resume/${r.id}`} className={styles.nameLink}>
                        {r.name}
                      </Link>
                    </td>
                    <td className={cx(styles.cell, styles.wideOnly, styles.dateCell)}>{fmtDate(r.updatedAt)}</td>
                    <td className={cx(styles.cell, styles.wideOnly, styles.dateCell)}>{fmtDate(r.createdAt)}</td>
                    <td className={styles.cell}>
                      <ResumeActions resume={r} onChanged={refresh} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resumes && resumes.length > 0 && view === "grid" && (
          <div className={styles.grid}>
            {resumes.map((r) => (
              <div key={r.id} className={styles.card} data-testid="resume-card">
                <Link href={`/resume/${r.id}`} className={styles.cardThumbLink}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic local thumbnail */}
                  <img src={api.thumbnailUrl(r.id, r.updatedAt)} alt={`Preview of ${r.name}`} className={styles.cardThumb} loading="lazy" />
                </Link>
                <div className={styles.cardBody}>
                  <Link href={`/resume/${r.id}`} className={styles.cardName}>
                    {r.name}
                  </Link>
                  <div className={styles.cardMeta}>Modified {fmtDate(r.updatedAt)}</div>
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
