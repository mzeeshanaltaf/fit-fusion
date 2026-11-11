"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { emailOtp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { EmailDeliveryNote, OtpField } from "@/components/auth/otp-field";
import { AuthShell, authLinkClass } from "@/components/auth/auth-shell";
import { useCooldown } from "@/hooks/use-cooldown";

export function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown(60);

  /**
   * Always resolves successfully for addresses with no account (and sends
   * nothing) — deliberate, to prevent account enumeration. The copy below
   * stays neutral for that reason.
   */
  async function requestCode(): Promise<boolean> {
    const { error } = await emailOtp.requestPasswordReset({ email: email.trim() });
    if (error) {
      toast.error(error.message ?? "Could not send a code.");
      return false;
    }
    return true;
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!(await requestCode())) return;
      cooldown.start();
      setStep("reset");
      toast.success("If an account exists for that email, we sent a code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      if (!(await requestCode())) return;
      cooldown.start();
      setOtp("");
      toast.success("A new code is on its way.");
    } finally {
      setResending(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await emailOtp.resetPassword({
        email: email.trim(),
        otp,
        password,
      });
      if (error) {
        toast.error(error.message ?? "Could not reset your password.");
        return;
      }
      // resetPassword creates no session — send them through sign-in.
      toast.success("Password updated. Sign in with your new password.");
      router.push("/sign-in");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={step === "request" ? "Reset password" : "New password"}
      description={
        step === "request" ? (
          "Enter your email. If an account exists, we send a 6-digit code."
        ) : (
          <>
            Enter the code sent to{" "}
            <span className="font-semibold break-all text-foreground">
              {email}
            </span>
            , then choose a new password.
          </>
        )
      }
      footer={
        <>
          Remembered it?{" "}
          <Link href="/sign-in" className={authLinkClass}>
            Back to sign in
          </Link>
        </>
      }
    >
      {step === "request" ? (
        <form onSubmit={handleRequest} className="grid gap-4">
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

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="grid gap-4">
          <OtpField
            value={otp}
            onChange={setOtp}
            disabled={loading}
            autoFocus
          />

          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Reset password
          </Button>

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              loading={resending}
              disabled={cooldown.active}
            >
              {cooldown.active
                ? `Resend code in ${cooldown.remaining}s`
                : "Resend code"}
            </Button>
          </div>

          <EmailDeliveryNote />
        </form>
      )}
    </AuthShell>
  );
}
