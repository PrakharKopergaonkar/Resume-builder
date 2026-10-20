import { Suspense } from "react";
import { Editor } from "@/components/editor/Editor";

export default function EditorPage({ params }: PageProps<"/resume/[id]">) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading editor…</div>}>
      <Editor params={params} />
    </Suspense>
  );
}
