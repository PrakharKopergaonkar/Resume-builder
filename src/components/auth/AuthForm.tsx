"use client";

import { useState } from "react";
import { Button, TextField } from "@/components/ui";
import styles from "./AuthForm.module.scss";

export const inlineLinkClass = styles.inlineLink;

/** Moves focus to the first invalid field once React has rendered the error states. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
}

/** Only same-app paths are allowed as a post-login destination (no "//evil.com" or absolute URLs). */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login") || next.startsWith("/signup")) return "/";
  return next;
}

export function AuthForm({ onSubmit, children, formRef }: { onSubmit: () => void; children: React.ReactNode; formRef: React.Ref<HTMLFormElement> }) {
  return (
    <form
      ref={formRef}
      className={styles.form}
      noValidate // our own messages instead of the browser's popups
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export function FormBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className={styles.banner}>
      {message}
    </div>
  );
}

export function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <Button type="submit" variant="primary" className={styles.submit} disabled={busy}>
      {busy ? busyLabel : label}
    </Button>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: React.ReactNode;
  hint?: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      label={label}
      required
      type={shown ? "text" : "password"}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      hint={hint}
      end={
        <button
          type="button"
          className={styles.reveal}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? "Hide" : "Show"}
        </button>
      }
    />
  );
}
