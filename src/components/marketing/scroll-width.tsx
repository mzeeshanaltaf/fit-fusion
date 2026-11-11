"use client";

import { useEffect, useRef } from "react";

/**
 * Headline whose type width follows scroll: condensed as it enters the bottom of
 * the viewport, relaxing toward `to` as it reaches the middle. Writes the
 * registered `--wdth` property straight to the element (no React state per frame).
 * Server HTML and first client render carry no inline style, so it hydrates cleanly.
 * Reduced motion: never touches the element, so it rests at its utility width.
 */
export function ScrollWidth({
  as: Tag = "h2",
  from = 62,
  to = 92,
  className,
  children,
}: {
  as?: "h1" | "h2" | "p";
  from?: number;
  to?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the headline's top is at the bottom edge, 1 when it is at 45% down.
      const t = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.55)));
      el.style.setProperty("--wdth", String(Math.round(from + (to - from) * t)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [from, to]);

  const Component = Tag as React.ElementType;
  return (
    <Component ref={ref} className={className}>
      {children}
    </Component>
  );
}
