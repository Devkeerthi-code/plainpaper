"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { api, errorMessage } from "@/lib/client/api";

type Mode = "login" | "signup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const signup = mode === "signup";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const found: typeof errors = {};
    if (!EMAIL.test(email.trim())) found.email = "Enter an email like name@example.com.";
    if (password.length < 8 || password.length > 72) found.password = "Use 8 to 72 characters.";
    setErrors(found);
    if (found.email || found.password) return;
    setPending(true);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: { email: email.trim(), password } });
      router.replace(next);
      router.refresh();
      toast(signup ? "Account created. You can now save readings." : "Welcome back.");
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      setPending(false);
    }
  };

  const alt = `${signup ? "/login" : "/signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="sheets-behind" aria-hidden="true" />
        <div className="sheet-card">
          <p className="eyebrow">{signup ? "Create an account" : "Log in"}</p>
          <h1 className="h2" style={{ marginTop: 8 }}>
            {signup ? "Keep your readings for 30 days" : "Welcome back"}
          </h1>
          <p className="muted small" style={{ marginTop: 8 }}>
            {signup ? "Only your email and a password. No phone number, no spam." : "Log in to see and save your readings."}
          </p>
          <form onSubmit={submit} noValidate>
            {errors.form && (
              <p className="form-error" role="alert">
                {errors.form}
              </p>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-err" required />
              {errors.email && (
                <span id="email-err" className="err">
                  {errors.email}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pw-wrap">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby="pw-help"
                  minLength={8}
                  maxLength={72}
                  required
                  style={{ paddingRight: 72 }}
                />
                <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              <span id="pw-help" className={errors.password ? "err" : "tiny faint"}>
                {errors.password ?? (signup ? "At least 8 characters." : " ")}
              </span>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              {pending && <span className="spin" aria-hidden="true" />}
              {signup ? "Create account" : "Log in"}
            </button>
          </form>
          <p className="auth-foot">
            {signup ? "Already have an account? " : "New here? "}
            <Link className="link" href={alt}>
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
