import Link from "next/link";
import { cn } from "@/lib/utils";

/** "FITFUSION" in heavy condensed caps. The only logo; there is no icon. */
export function Wordmark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="FitFusion home"
      className={cn(
        "wdth-75 text-2xl leading-none font-black tracking-tight uppercase",
        className
      )}
    >
      Fit<span className="text-signal">Fusion</span>
    </Link>
  );
}
