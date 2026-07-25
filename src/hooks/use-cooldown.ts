"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Countdown for "Resend code" buttons. Mirrors the server's 3-per-60s limit
 * (emailOTP rateLimit) so users see a friendly timer instead of an opaque
 * rate-limit error.
 */
export function useCooldown(seconds = 60) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const start = useCallback(() => setRemaining(seconds), [seconds]);

  return { remaining, start, active: remaining > 0 };
}
