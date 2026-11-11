"use client";

import { useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SAMPLE_PROFILE,
  SAMPLE_TARGETS,
  SAMPLE_WEEK,
} from "@/components/marketing/sample-data";
import { ScrollWidth } from "@/components/marketing/scroll-width";

const STEPS = [
  { n: "01", title: "Profile", text: "Seven answers. About a minute." },
  { n: "02", title: "Targets", text: "Calories and macros, worked out in code." },
  { n: "03", title: "Plan", text: "Workouts picked from the library, then meals." },
];

/**
 * "Profile to plan", driven by scroll. On md+ the section is tall with a sticky
 * stage and the plan sheet fills as you scroll through it; below md it flows normally and
 * fills as it crosses the viewport. Elements carry `data-at` (a 0..1 threshold); the
 * scroll handler flips `data-on` directly on the DOM (no React state per frame).
 * Before JS arms it, and under prefers-reduced-motion, everything renders filled.
 */
export function PlanSequence() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-at]"));
    const bar = el.querySelector<HTMLElement>("[data-bar]");
    const desktop = window.matchMedia("(min-width: 768px)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      let p: number;
      if (desktop.matches) {
        p = -rect.top / Math.max(1, rect.height - vh);
      } else {
        p = (vh * 0.85 - rect.top) / Math.max(1, rect.height * 0.9);
      }
      p = Math.min(1, Math.max(0, p));
      if (bar) bar.style.transform = `scaleX(${p})`;
      for (const it of items) {
        const at = Number(it.dataset.at);
        if (p >= at) it.setAttribute("data-on", "");
        else it.removeAttribute("data-on");
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    el.setAttribute("data-armed", "");
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      el.removeAttribute("data-armed");
    };
  }, []);

  return (
    <div ref={root} className="group/seq md:data-armed:h-[320vh]">
      <div className="md:top-16 md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:group-data-armed/seq:sticky">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:gap-14 md:py-10">
          <div className="grid content-start gap-8">
            <div className="grid gap-4">
              <p className="t-label text-signal">How it works</p>
              <ScrollWidth className="t-headline" from={62} to={80}>
                Profile in. Plan out.
              </ScrollWidth>
            </div>

            <ol className="grid gap-0 border-t-2 border-foreground">
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  data-at={[0, 0.34, 0.56][i]}
                  className="grid grid-cols-[3.5rem_1fr] items-baseline gap-3 border-b border-border py-3"
                >
                  <span className="t-stat text-3xl text-signal">{s.n}</span>
                  <span>
                    <span className="t-heading block">{s.title}</span>
                    <span className="t-small text-muted-foreground">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div
              aria-hidden
              className="hidden h-2 bg-secondary md:block"
            >
              <div
                data-bar
                className="h-full origin-left bg-primary"
                style={{ transform: "scaleX(1)" }}
              />
            </div>
          </div>

          <div className="surface-ink grid content-start gap-6 border border-border p-5 sm:p-6">
            <section aria-label="Profile">
              <p className="t-label mb-2 text-muted-foreground">Your profile</p>
              <dl className="grid grid-cols-2 gap-x-6 xl:grid-cols-4">
                {SAMPLE_PROFILE.map((f, i) => (
                  <div
                    key={f.label}
                    data-at={0.02 + i * 0.045}
                    className="border-t border-border py-2"
                  >
                    <dt className="t-label text-muted-foreground">{f.label}</dt>
                    <dd className="t-num font-bold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-label="Targets" data-at={0.36}>
              <p className="t-label mb-2 text-muted-foreground">Daily targets</p>
              <div className="grid grid-cols-2 gap-4 border-t-2 border-foreground pt-3 xl:grid-cols-4">
                {[
                  ["Calories", SAMPLE_TARGETS.kcal, "kcal"],
                  ["Protein", SAMPLE_TARGETS.protein, "g"],
                  ["Carbs", SAMPLE_TARGETS.carbs, "g"],
                  ["Fat", SAMPLE_TARGETS.fat, "g"],
                ].map(([label, value, unit], i) => (
                  <div key={label} data-at={0.37 + i * 0.04}>
                    <p className="t-label text-muted-foreground">{label}</p>
                    <p className="t-stat text-4xl">
                      {value}
                      <span className="wdth-100 ml-1 text-sm font-semibold text-muted-foreground">
                        {unit}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Workouts">
              <p className="t-label mb-2 text-muted-foreground">Your week</p>
              <Table density="compact" aria-label="Four workouts in the plan">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Workout</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead numeric>Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SAMPLE_WEEK.map((w, i) => (
                    <TableRow
                      key={w.name}
                      data-at={0.58 + i * 0.1}
                      className="hover:bg-transparent"
                    >
                      <TableCell className="font-semibold">{w.name}</TableCell>
                      <TableCell className="text-muted-foreground">{w.kind}</TableCell>
                      <TableCell numeric>{w.minutes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
