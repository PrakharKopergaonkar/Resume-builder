import { Suspense } from "react";
import { PrintView } from "@/components/print/PrintView";

export default function PrintPage({ params }: PageProps<"/print/[id]">) {
  return (
    <Suspense fallback={null}>
      <PrintView params={params} />
    </Suspense>
  );
}
