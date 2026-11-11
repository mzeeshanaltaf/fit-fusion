"use client";

import { Button } from "@/components/ui/button";

/**
 * Inline confirmation for a swap or a regenerated day. Both are free but use one of the
 * plan's edits, so the user sees the cost and the wait before committing. (DESIGN.md:
 * expand inline before reaching for a dialog.)
 */
export function EditConfirm({
  description,
  editsLeft,
  editLimit,
  seconds,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  description: string;
  editsLeft: number;
  editLimit: number;
  /** Rough wait, shown so a 30 s spinner is not a surprise. */
  seconds: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Confirm edit"
      className="grid gap-3 rounded-md border border-foreground bg-card p-4"
    >
      <p className="t-small">
        {description}{" "}
        <span className="font-semibold">
          Uses 1 of your {editLimit} edits ({editsLeft} left). Takes about {seconds}.
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
