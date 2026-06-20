"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Heart,
  User,
  Building2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { signUp, type AuthState } from "@/app/actions/auth";

type StepData = {
  email: string;
  password: string;
  role: "DONOR" | "ORGANIZATION" | "";
};

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepData, setStepData] = useState<StepData>({
    email: "",
    password: "",
    role: "",
  });
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUp,
    null
  );

  const error = state && "error" in state ? state.error : null;
  const message = state && "message" in state ? state.message : null;

  // ── Step 1: collect credentials, advance without network call ──────────────
  const handleStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStepData((prev) => ({
      ...prev,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    }));
    setStep(2);
  };

  // ── Step 2: role selection ──────────────────────────────────────────────────
  const selectRole = (role: "DONOR" | "ORGANIZATION") => {
    setStepData((prev) => ({ ...prev, role }));
    setStep(3);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
            <Heart
              size={20}
              className="text-[var(--primary)]"
              fill="currentColor"
            />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Create your account
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Join Pradaan and give with purpose
          </p>
        </div>

        {/* Step progress dots */}
        <StepIndicator current={step} total={3} />

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {/* ─── Step 1 ──────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <StepHeader
                title="Your credentials"
                subtitle="Step 1 of 3"
              />
              <form onSubmit={handleStep1} className="mt-5 flex flex-col gap-4">
                <Field
                  id="s1-email"
                  name="email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  defaultValue={stepData.email}
                />
                <Field
                  id="s1-password"
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button type="submit" className={primaryBtnCls}>
                  Continue
                </button>
              </form>
            </>
          )}

          {/* ─── Step 2 ──────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <StepHeader title="I am a…" subtitle="Step 2 of 3" />
              <div className="mt-5 flex flex-col gap-3">
                <RoleCard
                  icon={<User size={20} />}
                  title="Donor"
                  description="I want to donate to causes I care about"
                  onClick={() => selectRole("DONOR")}
                />
                <RoleCard
                  icon={<Building2 size={20} />}
                  title="Organisation"
                  description="We run a non-profit and want to raise funds"
                  onClick={() => selectRole("ORGANIZATION")}
                />
              </div>
              <BackButton onClick={() => setStep(1)} />
            </>
          )}

          {/* ─── Step 3 ──────────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <StepHeader
                title={
                  stepData.role === "DONOR"
                    ? "Your profile"
                    : "Your organisation"
                }
                subtitle="Step 3 of 3"
              />

              {/* Confirmation message — shown after successful signup */}
              {message ? (
                <div className="mt-5 flex flex-col items-center gap-3 text-center">
                  <CheckCircle2
                    size={36}
                    className="text-[var(--primary)]"
                  />
                  <p className="text-sm text-[var(--foreground)]">{message}</p>
                  <Link
                    href="/login"
                    className="mt-1 text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    Go to login
                  </Link>
                </div>
              ) : (
                <form action={action} className="mt-5 flex flex-col gap-4">
                  {/* Carry forward data from steps 1 & 2 as hidden inputs */}
                  <input type="hidden" name="email" value={stepData.email} />
                  <input
                    type="hidden"
                    name="password"
                    value={stepData.password}
                  />
                  <input type="hidden" name="role" value={stepData.role} />

                  {error && <Banner variant="error">{error}</Banner>}

                  {stepData.role === "DONOR" ? (
                    <Field
                      id="full_name"
                      name="full_name"
                      label="Full name"
                      type="text"
                      placeholder="Asha Mehta"
                      required
                      autoComplete="name"
                    />
                  ) : (
                    <>
                      <Field
                        id="org_name"
                        name="org_name"
                        label="Organisation name"
                        type="text"
                        placeholder="Seva Foundation"
                        required
                      />
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="description"
                          className="text-sm font-medium text-[var(--foreground)]"
                        >
                          About your organisation
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={3}
                          required
                          placeholder="What does your organisation do?"
                          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)] resize-none"
                        />
                      </div>
                      <Field
                        id="website"
                        name="website"
                        label="Website (optional)"
                        type="url"
                        placeholder="https://seva.org"
                        autoComplete="url"
                      />
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {pending && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {pending ? "Creating account…" : "Create account"}
                  </button>
                </form>
              )}

              {!message && <BackButton onClick={() => setStep(2)} />}
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--primary)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const primaryBtnCls =
  "flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90";

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s <= current
              ? "w-8 bg-[var(--primary)]"
              : "w-1.5 bg-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {subtitle}
      </p>
      <h2 className="mt-0.5 text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h2>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]"
    >
      <span className="mt-0.5 text-[var(--primary)]">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </button>
  );
}

function Field({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[var(--foreground)]"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
      />
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
    >
      <ArrowLeft size={13} />
      Back
    </button>
  );
}

function Banner({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
}) {
  const cls =
    variant === "error"
      ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
      : "bg-[var(--accent)] text-[var(--accent-foreground)]";
  return (
    <div className={`rounded-md px-3 py-2.5 text-sm ${cls}`}>{children}</div>
  );
}
