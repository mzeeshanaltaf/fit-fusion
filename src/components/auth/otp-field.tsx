"use client";

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
    <div className="flex justify-center">
      <InputOTP
        maxLength={6}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        autoFocus={autoFocus}
      >
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-11 rounded-md border text-lg font-semibold first:rounded-l-md last:rounded-r-md border-l"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

/**
 * Persistent on-screen note, not a toast — toasts vanish at exactly the moment
 * the user switches to their mail client. Naming the sender matters: people
 * search their spam folder by address.
 */
export function EmailDeliveryNote() {
  return (
    <p className="rounded-md border bg-muted/40 px-3 py-2.5 text-center text-xs text-muted-foreground">
      Can&apos;t find the email? Check your spam or junk folder — it arrives from{" "}
      <span className="font-medium break-all text-foreground">
        {OTP_SENDER_EMAIL}
      </span>
      .
    </p>
  );
}
