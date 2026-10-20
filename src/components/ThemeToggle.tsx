"use client";

import { useTheme } from "@/lib/theme";
import { Button, Icon } from "./ui";
import styles from "./ThemeToggle.module.scss";

/** Header button for switching between the light and dark theme. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="secondary"
      className={styles.toggle}
      aria-label="Dark theme"
      title="Dark theme"
      aria-pressed={theme === "dark"}
      onClick={toggle}
    >
      <Icon name="moon" className={styles.moon} />
      <Icon name="sun" className={styles.sun} />
    </Button>
  );
}
