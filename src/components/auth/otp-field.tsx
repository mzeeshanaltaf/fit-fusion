"use client";

import { InfoIcon } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { OTP_SENDER_EMAIL } from "@/lib/constants";

/**
 * Six-digit code input, shared by the verify-email and forgot-password
 * screens so they stay visually identical.
 */
export function OtpField({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <InputOTP
        maxLength={6}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label="6-digit code"
        containerClassName="justify-start"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} className="h-12 w-11" />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

/**
 * Persistent on-screen note, not a toast: toasts vanish at exactly the moment
 * the user switches to their mail client. Naming the sender matters: people
 * search their spam folder by address.
 */
export function EmailDeliveryNote() {
  return (
    <p className="t-small flex items-start gap-2 border border-border bg-secondary px-3 py-2.5 text-muted-foreground">
      <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        No email? Check spam or junk. It comes from{" "}
        <span className="font-semibold break-all text-foreground">
          {OTP_SENDER_EMAIL}
        </span>
        .
      </span>
    </p>
  );
}
