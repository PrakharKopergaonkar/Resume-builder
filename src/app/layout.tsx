import type { Metadata } from "next";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/400-italic.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "@fontsource/lato/300.css";
import "@fontsource/lato/400.css";
import "@fontsource/lato/400-italic.css";
import "@fontsource/lato/700.css";
import "./globals.css";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "Resume Builder",
  description: "Build, edit and download resumes locally",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={styles.html}>
      <body className={styles.body}>{children}</body>
    </html>
  );
}
