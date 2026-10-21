"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon, IconButton } from "@/components/ui";
import styles from "./ImportNotice.module.scss";

/** After a JSON Resume import, says which sections couldn't be brought in (`?skipped=Volunteer, References`). */
export function ImportNotice() {
  const skipped = useSearchParams().get("skipped");
  const router = useRouter();
  const pathname = usePathname();
  if (!skipped) return null;
  return (
    <div className={styles.notice} role="status">
      <Icon name="alert" size="xs" />
      <span>
        Imported. These sections have no match here and were skipped: <strong>{skipped}</strong>.
      </span>
      <IconButton icon="close" label="Dismiss" onClick={() => router.replace(pathname)} />
    </div>
  );
}
