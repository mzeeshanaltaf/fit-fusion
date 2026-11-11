import Link from "next/link";
import { Wordmark } from "@/components/marketing/wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#library", label: "Library" },
      { href: "/sign-up", label: "Start free" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark className="text-3xl" />
            <p className="t-small mt-3 max-w-xs text-muted-foreground">
              A workout plan and 5 days of meals, built for your profile in
              about 30 seconds.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="t-label mb-3 text-muted-foreground">{col.title}</h2>
              <ul className="grid gap-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex min-h-8 items-center text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="t-small mt-12 border-t border-border pt-6 text-muted-foreground">
          © {new Date().getFullYear()} FitFusion. Plans are general wellness
          information, not medical advice.
        </p>
      </div>
    </footer>
  );
}
