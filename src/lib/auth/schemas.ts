import { z } from "zod";

// Shared by the API (server-side checks) and the sign-up/log-in forms (same rules, checked before submit).

export const PASSWORD_MIN = 8;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address" }));

export const signupSchema = z.object({
  name: z.string().trim().min(1, { error: "Required" }).max(100),
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN, { error: `At least ${PASSWORD_MIN} characters` }).max(200),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Required" }).max(200),
});
