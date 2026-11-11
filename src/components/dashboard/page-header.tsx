import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The top of every dashboard screen: one `t-title`, one plain sentence, and at most one
 * primary action (right on tablet and up, full width on a phone via the action's own class).
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="t-title">{title}</h1>
        {description ? (
          <p className="t-small mt-2 max-w-prose text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** A ruled section: 2px ink rule, a label, then content. Use instead of nesting cards. */
export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t-2 border-foreground pt-4", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="t-label">{title}</h2>
        {aside ? <div className="t-small text-muted-foreground">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
