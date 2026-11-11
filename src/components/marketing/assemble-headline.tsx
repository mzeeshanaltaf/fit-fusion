import { cn } from "@/lib/utils";

/**
 * Headline that assembles on load: each word rises in and tightens from wide to
 * condensed (CSS only, see `.assemble-word` in globals.css). Server-rendered and
 * deterministic, so there is no hydration risk. Under prefers-reduced-motion the
 * words simply render in their final state.
 *
 * The accessible name is the full sentence; the split words are hidden from AT.
 */
export function AssembleHeadline({
  lines,
  className,
  accentLast = false,
}: {
  /** One string per visual line; each word animates in order. */
  lines: string[];
  className?: string;
  /** Colour the final word with the signal red. */
  accentLast?: boolean;
}) {
  const label = lines.join(" ");
  const total = lines.flatMap((l) => l.split(" ")).length;
  let i = 0;

  return (
    <h1 aria-label={label} className={cn("t-display", className)}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden className="block">
          {line.split(" ").map((word) => {
            const idx = i++;
            return (
              <span
                key={idx}
                className={cn(
                  "assemble-word",
                  accentLast && idx === total - 1 && "text-signal"
                )}
                style={{ "--i": idx } as React.CSSProperties}
              >
                {word}
                {" "}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
