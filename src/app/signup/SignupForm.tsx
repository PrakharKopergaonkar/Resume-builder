"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForm, FormBanner, PasswordField, SubmitButton, focusFirstInvalid, inlineLinkClass, safeNext } from "@/components/auth/AuthForm";
import { TextField } from "@/components/ui";
import { authApi } from "@/lib/api";
import { emailSchema, PASSWORD_MIN } from "@/lib/auth/schemas";

type Field = "name" | "email" | "password" | "confirm";
type Values = Record<Field, string>;

function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (!v.name.trim()) e.name = "Required";
  if (!v.email.trim()) e.email = "Required";
  else if (!emailSchema.safeParse(v.email).success) e.email = "Enter a valid email address";
  if (!v.password) e.password = "Required";
  else if (v.password.length < PASSWORD_MIN) e.password = `At least ${PASSWORD_MIN} characters`;
  if (!v.confirm) e.confirm = "Required";
  else if (v.confirm !== v.password) e.confirm = "Passwords don't match";
  return e;
}

export function SignupForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Errors appear once a field has been left (or on submit), and update live after that.
  const errors = validate(values);
  const shown = (f: Field) => (touched[f] ? errors[f] : undefined);
  const set = (f: Field) => (v: string) => {
    setValues((s) => ({ ...s, [f]: v }));
    if (f === "email") setEmailTaken(false);
  };
  const touch = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  const submit = async () => {
    if (busyRef.current) return;
    setTouched({ name: true, email: true, password: true, confirm: true });
    setBanner(null);
    if (Object.keys(errors).length) return focusFirstInvalid(formRef.current);

    busyRef.current = true;
    setBusy(true);
    const res = await authApi.signup({ name: values.name, email: values.email, password: values.password });
    if (res.ok) {
      window.location.assign(safeNext(next));
      return;
    }
    busyRef.current = false;
    setBusy(false);
    if (res.code === "email_taken") {
      setEmailTaken(true);
      focusFirstInvalid(formRef.current);
    } else {
      setBanner("Something went wrong. Try again.");
    }
  };

  const loginHref = (withEmail: boolean) => {
    const q = new URLSearchParams();
    if (next) q.set("next", next);
    if (withEmail && values.email) q.set("email", values.email.trim());
    const s = q.toString();
    return s ? `/login?${s}` : "/login";
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="We'll set you up with a sample resume to start from."
      footer={
        <>
          Already have an account? <Link href={loginHref(false)}>Log in</Link>
        </>
      }
    >
      <AuthForm onSubmit={submit} formRef={formRef}>
        <FormBanner message={banner} />
        <TextField label="Full name" required autoComplete="name" value={values.name} onChange={set("name")} onBlur={touch("name")} error={shown("name")} autoFocus />
        <TextField
          label="Email"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={set("email")}
          onBlur={touch("email")}
          error={
            emailTaken ? (
              <>
                An account with this email already exists.{" "}
                <Link href={loginHref(true)} className={inlineLinkClass}>
                  Log in instead?
                </Link>
              </>
            ) : (
              shown("email")
            )
          }
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          onBlur={touch("password")}
          error={shown("password")}
          hint={`At least ${PASSWORD_MIN} characters`}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set("confirm")}
          onBlur={touch("confirm")}
          error={shown("confirm")}
        />
        <SubmitButton busy={busy} label="Create account" busyLabel="Creating account…" />
      </AuthForm>
    </AuthCard>
  );
}
