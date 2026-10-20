"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useEditor } from "./editor";

const DEBOUNCE_MS = 800;

/** Debounced PATCH of the whole snapshot after each change; flushes when the page is hidden or closed. */
export function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const save = async () => {
      const { id, doc, version, setSaveState } = useEditor.getState();
      if (!id || !doc || inFlight) return;
      inFlight = true;
      setSaveState("saving");
      try {
        await api.update(id, doc);
        // Only mark saved if nothing changed while the request was in flight.
        if (useEditor.getState().version === version) setSaveState("saved");
        else schedule();
      } catch {
        setSaveState("error");
      } finally {
        inFlight = false;
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(save, DEBOUNCE_MS);
    };

    const flush = () => {
      const { id, doc, saveState, setSaveState } = useEditor.getState();
      if (!id || !doc || saveState === "saved") return;
      clearTimeout(timer);
      fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
        keepalive: true,
      }).catch(() => setSaveState("error"));
      // pagehide, visibilitychange and unmount can all fire together; send only once.
      setSaveState("saved");
    };

    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.version !== prev.version && s.id === prev.id) schedule();
    });
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      flush();
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
}
