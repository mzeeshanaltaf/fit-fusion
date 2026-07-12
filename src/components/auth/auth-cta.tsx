"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
type ButtonSize = VariantProps<typeof buttonVariants>["size"];

interface AuthCtaProps {
  loggedOutLabel: string;
  loggedInLabel: string;
  /** Where signed-out users go. Defaults to the sign-up page. */
  loggedOutHref?: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrowClassName?: string;
  /** Show the trailing arrow icon. Defaults to true. */
  showArrow?: boolean;
}

/**
 * Auth-aware call-to-action. Renders a link to sign-up (or a custom target)
 * for signed-out visitors and a link to the dashboard for signed-in users.
 * Replaces the former Clerk <SignedIn>/<SignedOut> gating on the landing page.
 */
export function AuthCta({
  loggedOutLabel,
  loggedInLabel,
  loggedOutHref = "/sign-up",
  className,
  variant,
  size,
  arrowClassName = "h-4 w-4",
  showArrow = true,
}: AuthCtaProps) {
  const { data: session, isPending } = useSession();
  const signedIn = !!session?.user;

  const href = signedIn ? "/dashboard" : loggedOutHref;
  const label = signedIn ? loggedInLabel : loggedOutLabel;

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
      data-pending={isPending ? "" : undefined}
    >
      <Link href={href}>
        {label}
        {showArrow && <ArrowRight className={arrowClassName} />}
      </Link>
    </Button>
  );
}
