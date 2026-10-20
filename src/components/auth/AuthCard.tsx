import { Icon } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./AuthCard.module.scss";

/** Centered card shared by the Log in and Create account screens. */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Icon name="file" size="md" className={styles.brandIcon} />
          <span className={styles.brandName}>Resume Builder</span>
          <div className={styles.brandEnd}>
            <ThemeToggle />
          </div>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.body}>{children}</div>
        <p className={styles.footer}>{footer}</p>
      </div>
    </main>
  );
}
