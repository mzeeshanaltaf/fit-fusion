"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { emailOtp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { EmailDeliveryNote, OtpField } from "@/components/auth/otp-field";
import { useCooldown } from "@/hooks/use-cooldown";
import { AuthShell, authLinkClass } from "@/components/auth/auth-shell";

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
    <AuthShell
      title="Verify your email"
      description={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-semibold break-all text-foreground">{email}</span>.
        </>
      }
      footer={
        <>
          Wrong email?{" "}
          <Link href="/sign-up" className={authLinkClass}>
            Start over
          </Link>
        </>
      }
    >
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
          size="lg"
          className="w-full"
          loading={verifying}
          disabled={otp.length !== 6}
        >
          Verify email
        </Button>
      </form>

      <div className="mt-4">
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

      <div className="mt-4">
        <EmailDeliveryNote />
      </div>
    </AuthShell>
  );
}
