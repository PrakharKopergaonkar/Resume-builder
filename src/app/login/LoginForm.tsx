"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForm, FormBanner, PasswordField, SubmitButton, focusFirstInvalid, safeNext } from "@/components/auth/AuthForm";
import { TextField } from "@/components/ui";
import { authApi } from "@/lib/api";
import { emailSchema } from "@/lib/auth/schemas";

type Errors = { email?: string; password?: string };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // blocks a second submit before React re-renders the disabled button
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async () => {
    if (busyRef.current) return;
    const found: Errors = {};
    if (!email.trim()) found.email = "Required";
    else if (!emailSchema.safeParse(email).success) found.email = "Enter a valid email address";
    if (!password) found.password = "Required";
    setErrors(found);
    setBanner(null);
    if (found.email || found.password) return focusFirstInvalid(formRef.current);

    busyRef.current = true;
    setBusy(true);
    const res = await authApi.login({ email, password });
    if (res.ok) {
      window.location.assign(safeNext(next)); // full load, so every page sees the new session
      return;
    }
    busyRef.current = false;
    setBusy(false);
    setBanner(res.status === 401 ? "Email or password is incorrect." : "Something went wrong. Try again.");
  };

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back. Sign in to your resumes."
      footer={
        <>
          New here? <Link href={signupHref}>Create an account</Link>
        </>
      }
    >
      <AuthForm onSubmit={submit} formRef={formRef}>
        <FormBanner message={banner} />
        <TextField
          label="Email"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoFocus={!email}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <SubmitButton busy={busy} label="Log in" busyLabel="Logging in…" />
      </AuthForm>
    </AuthCard>
  );
}
