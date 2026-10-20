"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ResumeRenderer } from "@/components/renderer/ResumeRenderer";
import { api } from "@/lib/api";
import { PAGE_MARGIN_MM, PAPER } from "@/lib/paper";
import type { ResumeDoc } from "@/types/resume";

/**
 * Chrome-less page that Puppeteer prints to PDF and screenshots for thumbnails.
 * `?autoprint=1` opens the browser print dialog (the "Print" action).
 */
export function PrintView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const autoprint = useSearchParams().get("autoprint") === "1";
  const [doc, setDoc] = useState<ResumeDoc | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(id).then(setDoc, () => setError(true));
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    document.title = doc.name;
    if (!autoprint) return;
    let cancelled = false;
    document.fonts.ready.then(() => !cancelled && window.print());
    return () => {
      cancelled = true;
    };
  }, [doc, autoprint]);

  if (error) return <p className="p-8 text-sm text-red-700">Resume not found.</p>;
  if (!doc) return null;

  const paper = PAPER[doc.style.paper];
  return (
    <div className="print-root flex justify-center bg-neutral-200 py-8 print:block print:bg-white print:py-0" data-render-ready>
      <style>{`@page { size: ${paper.css}; margin: ${PAGE_MARGIN_MM.y}mm ${PAGE_MARGIN_MM.x}mm; }`}</style>
      <div className="shadow-lg print:shadow-none">
        <ResumeRenderer resume={doc} />
      </div>
    </div>
  );
}
