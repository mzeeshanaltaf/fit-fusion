import { Wordmark } from "@/components/marketing/wordmark";

/**
 * Shared frame for sign-in, sign-up, verify-email and forgot-password so the four
 * screens stay identical: wordmark, a 2px ink rule, one title, one sentence, the form.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <Wordmark className="mb-8 inline-block text-3xl" />

      <div className="border-t-2 border-foreground pt-6">
        <h1 className="t-title">{title}</h1>
        <p className="t-small mt-2 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6">{children}</div>

      {footer ? (
        <p className="t-small mt-8 border-t border-border pt-5 text-muted-foreground">
          {footer}
        </p>
      ) : null}
    </div>
  );
}

export const authLinkClass =
  "font-semibold text-foreground underline underline-offset-4 hover:decoration-2";
