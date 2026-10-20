"use client";

import { forwardRef, useId } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.scss";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cx(styles.button, size === "sm" ? styles.sizeSm : styles.sizeMd, styles[variant], className)}
      {...props}
    />
  );
}

export const inputClass = styles.input;
export const selectClass = styles.select;
export const fieldLabelClass = styles.fieldLabel;

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx(styles.input, className)} {...props} />;
});

/** Labelled text input bound to a string value, with optional required marker, error and length counter. */
export function TextField({
  label,
  value,
  onChange,
  required,
  error,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const { maxLength } = props;
  return (
    <div className={className}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden>
            *
          </span>
        )}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {(error || maxLength != null) && (
        <div className={styles.fieldFooter}>
          <span id={errorId} className={styles.fieldError}>
            {error}
          </span>
          {maxLength != null && (
            <span className={styles.counter}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={styles.toggle}
    >
      <span className={styles.knob} />
    </button>
  );
}

/** Minimal inline icon set (24px viewBox, stroke icons). */
const PATHS = {
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  redo: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  download: "M12 4v12m0 0-5-5m5 5 5-5M5 20h14",
  print: "M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  copy: "M8 8h12v12H8zM4 16V4h12",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  arrowLeft: "M19 12H5m0 0 6-6m-6 6 6 6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  layout: "M4 4h16v16H4zM4 9h16M10 9v11",
  palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.6-1-2.5s.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4-4-7.5-9-7.5zM7.5 11h.01M10 7h.01M15 7h.01",
  file: "M14 3H6v18h12V7l-4-4zM14 3v4h4",
  check: "m5 12 5 5L20 7",
  alert: "M12 8v5M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
} as const;

export type IconName = keyof typeof PATHS;

const ICON_SIZES = { xs: styles.iconXs, sm: styles.icon, md: styles.iconMd, xl: styles.iconXl } as const;

/** `size`: xs = 14px, sm = 16px (default), md = 20px, xl = 40px. */
export function Icon({ name, size = "sm", className }: { name: IconName; size?: keyof typeof ICON_SIZES; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx(ICON_SIZES[size], className)}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function IconButton({
  icon,
  label,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(styles.iconButton, active && styles.iconButtonActive, className)}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
