import { Suspense } from "react";
import { Editor } from "@/components/editor/Editor";
import styles from "./page.module.scss";

export default function EditorPage({ params }: PageProps<"/resume/[id]">) {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading editor…</div>}>
      <Editor params={params} />
    </Suspense>
  );
}
