"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { emailOtp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { EmailDeliveryNote, OtpField } from "@/components/auth/otp-field";
import { useCooldown } from "@/hooks/use-cooldown";
import { Dumbbell, Loader2 } from "lucide-react";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown(60);

  // A code is always sent by the server before the user gets here (sign-up, or
  // the EMAIL_NOT_VERIFIED sign-in path), so never send on mount — that would
  // double-send and burn the rate limit.
  useEffect(() => {
    if (!email) router.replace("/sign-up");
  }, [email, router]);

  async function handleVerify(code: string) {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      const { error } = await emailOtp.verifyEmail({ email, otp: code });
      if (error) {
        toast.error(error.message ?? "That code isn't valid. Please try again.");
        setOtp("");
        return;
      }
      // autoSignInAfterVerification means the session already exists.
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const { error } = await emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) {
        toast.error(error.message ?? "Could not send a new code.");
        return;
      }
      cooldown.start();
      setOtp("");
      toast.success("A new code is on its way.");
    } catch {
      toast.error("Could not send a new code.");
    } finally {
      setResending(false);
    }
  }

  if (!email) return null;

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2">
        <Dumbbell className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">FitFusion</span>
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium break-all text-foreground">{email}</span>.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify(otp);
        }}
        className="space-y-4"
      >
        <OtpField
          value={otp}
          onChange={setOtp}
          onComplete={(code) => void handleVerify(code)}
          disabled={verifying}
          autoFocus
        />

        <Button
          type="submit"
          className="w-full gap-2"
          disabled={verifying || otp.length !== 6}
        >
          {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify email
        </Button>
      </form>

      <div className="mt-4 text-center">
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

      <div className="mt-4">
        <EmailDeliveryNote />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-foreground hover:underline"
        >
          Start over
        </Link>
      </p>
    </div>
  );
}
