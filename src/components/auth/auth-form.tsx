"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { AuthShell, authLinkClass } from "@/components/auth/auth-shell";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
    />
  </svg>
);

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function verifyUrl() {
    return `/verify-email?email=${encodeURIComponent(
      email.trim()
    )}&redirect=${encodeURIComponent("/dashboard")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp.email({ name: name.trim(), email: email.trim(), password })
        : await signIn.email({ email: email.trim(), password });

      if (error) {
        // The account exists but isn't verified. The server has already sent a
        // fresh code (emailVerification.sendOnSignIn), so hand off to the
        // verify screen rather than showing an error the user can't act on.
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.push(verifyUrl());
          return;
        }
        throw new Error(error.message ?? "Authentication failed.");
      }

      if (isSignUp) {
        // requireEmailVerification means sign-up issues no session.
        router.push(verifyUrl());
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch {
      toast.error("Could not start Google sign-in. Try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      title={isSignUp ? "Create your account" : "Sign in"}
      description={
        isSignUp
          ? "10 free plans. Verify your email and you are in."
          : "Back to your plans."
      }
      footer={
        isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className={authLinkClass}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/sign-up" className={authLinkClass}>
              Create an account
            </Link>
          </>
        )
      }
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogle}
        loading={googleLoading}
        disabled={loading}
      >
        {!googleLoading && <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="t-label text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {isSignUp && (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className="t-small font-semibold underline underline-offset-4 hover:decoration-2"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            aria-describedby={isSignUp ? "password-hint" : undefined}
            required
          />
          {isSignUp && (
            <p id="password-hint" className="t-small text-muted-foreground">
              At least 8 characters.
            </p>
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={googleLoading}>
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
