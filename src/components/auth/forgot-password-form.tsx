"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { emailOtp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailDeliveryNote, OtpField } from "@/components/auth/otp-field";
import { useCooldown } from "@/hooks/use-cooldown";
import { Dumbbell, Loader2 } from "lucide-react";

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
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2">
        <Dumbbell className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">FitFusion</span>
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {step === "request" ? "Forgot your password?" : "Choose a new password"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "request" ? (
            "Enter your email and we'll send you a 6-digit reset code."
          ) : (
            <>
              Enter the code we sent to{" "}
              <span className="font-medium break-all text-foreground">
                {email}
              </span>
              .
            </>
          )}
        </p>
      </div>

      {step === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <OtpField
            value={otp}
            onChange={setOtp}
            disabled={loading}
            autoFocus
          />

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset password
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resending || cooldown.active}
              className="gap-2"
            >
              {resending && <Loader2 className="h-4 w-4 animate-spin" />}
              {cooldown.active
                ? `Resend code in ${cooldown.remaining}s`
                : "Resend code"}
            </Button>
          </div>

          <EmailDeliveryNote />
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
