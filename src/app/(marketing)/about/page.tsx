import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Fill } from "@/components/ui/fill";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { AuthCta } from "@/components/auth/auth-cta";

export const metadata: Metadata = {
  title: "About",
  description:
    "How FitFusion builds a plan: calorie targets worked out in code, workouts picked from a library of 250, meals written to your numbers.",
  alternates: { canonical: "/about" },
};

const STEPS = [
  {
    title: "You give a profile",
    text: "Age, weight, height, goal, level, diet, allergies, equipment and training days.",
  },
  {
    title: "Code works out your numbers",
    text: "Calories come from the Mifflin-St Jeor equation, scaled by how many days you train and adjusted for your goal. Protein, fat and carbs follow from that. No model guesses them.",
  },
  {
    title: "Workouts come from the library",
    text: "We filter 250 real workouts by goal, level and equipment. A model picks from that short list, and every pick is checked against the library. It cannot invent a workout.",
  },
  {
    title: "Meals are written to the target",
    text: "A model writes 5 days of meals to hit your calories and macros, within your diet. Each meal is scanned for the allergens you listed.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
          <p className="t-label text-signal">About</p>
          <h1 className="t-headline max-w-4xl">A plan you can train from.</h1>
          <p className="t-lead">
            A coach hands you a sheet: what to lift, how many sets, how long to
            rest, what to eat. FitFusion makes that sheet from your profile in
            about 30 seconds, then gets out of the way.
          </p>
        </section>

        <section
          aria-labelledby="how-built"
          className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-16 sm:px-6 sm:pb-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14"
        >
          <h2 id="how-built" className="t-title">
            How a plan is made
          </h2>
          <ol className="grid border-t-2 border-foreground">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="grid grid-cols-[3rem_1fr] gap-3 border-b border-border py-5"
              >
                <span className="t-stat text-3xl text-signal">0{i + 1}</span>
                <div className="grid gap-1">
                  <h3 className="t-heading">{s.title}</h3>
                  <p className="t-body text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Fill tone="ink" className="border-y border-border">
          <div className="grid gap-10">
            <h2 className="t-title">The numbers</h2>
            <div className="grid gap-x-8 gap-y-10 border-t-2 border-foreground pt-8 sm:grid-cols-2 lg:grid-cols-4">
              <Stat size="lg" label="Workouts" value="250" />
              <Stat size="lg" label="Demo videos" value="529" />
              <Stat size="lg" label="Free plans" value="10" hint="At sign-up" />
              <Stat size="lg" label="Per plan" value="30" unit="s" hint="Typical" />
            </div>
          </div>
        </Fill>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <h2 className="t-title">Read this</h2>
          <div className="grid max-w-prose gap-4">
            <p className="t-body">
              Plans are general wellness information, not medical advice. If
              you are injured, pregnant, on medication or have a health
              condition, ask a professional before you start.
            </p>
            <p className="t-body">
              Your profile is used to build and store your plans. It is never
              sold. The details are in the{" "}
              <Link href="/privacy" className="font-semibold underline underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <AuthCta
                loggedOutLabel="Start free"
                loggedInLabel="Go to dashboard"
                size="lg"
              />
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
