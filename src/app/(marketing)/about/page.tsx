import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Target, Zap, Heart } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Goal-Oriented",
    description:
      "Every plan is built around your specific goal — whether that's fat loss, muscle gain, strength, or endurance. We don't do generic.",
  },
  {
    icon: Zap,
    title: "Fast & Accurate",
    description:
      "Our AI workflows generate complete workout and nutrition plans in under 60 seconds, without sacrificing quality or personalization.",
  },
  {
    icon: Heart,
    title: "Built for Everyone",
    description:
      "Beginner or advanced, 20 or 60 — FitFusion adapts to your body profile and training level so the plan actually fits your life.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 py-20 text-center">
          <div className="container mx-auto max-w-3xl">
            <Badge variant="secondary" className="mb-6">
              <Dumbbell className="mr-1.5 h-3.5 w-3.5" />
              About FitFusion
            </Badge>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl">
              Fitness plans that actually{" "}
              <span className="bg-linear-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                fit you
              </span>
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              FitFusion was built on a simple idea: your fitness plan should be
              as unique as you are. Generic workout templates don&apos;t account
              for your body, your goal, or your experience — so we built an AI
              that does.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-muted/30 px-4 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
              Our mission
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              We believe that access to a high-quality, personalized fitness
              plan shouldn&apos;t require an expensive personal trainer or hours
              of research. FitFusion democratizes fitness planning by combining
              AI with proven exercise science to deliver plans that are tailored
              to each individual user.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you&apos;re just starting out or you&apos;re a seasoned
              athlete looking to optimize, FitFusion gives you a complete
              roadmap — a structured workout routine and a 5-day nutrition plan
              with full macro breakdowns — all generated in under a minute.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight md:text-3xl">
              What we stand for
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {values.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex flex-col gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it's built */}
        <section className="bg-muted/30 px-4 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
              How FitFusion is built
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              FitFusion is powered by n8n AI workflows that process your profile
              data — age, weight, height, gender, fitness goal, and training
              level — and generate a structured, actionable plan. The frontend
              is built with Next.js, and all plan data is stored securely and
              tied to your account.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We take your privacy seriously. Your personal data is used only to
              generate and store your fitness plans, and is never sold or shared
              with third parties. See our{" "}
              <a
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:opacity-80"
              >
                Privacy Policy
              </a>{" "}
              for details.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
