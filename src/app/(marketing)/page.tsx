import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { ContactDialog } from "@/components/marketing/contact-dialog";
import {
  Dumbbell,
  Apple,
  Target,
  CheckCircle,
  ArrowRight,
  ClipboardList,
  Brain,
  TrendingUp,
  Flame,
  Sparkles,
  Zap,
  HeartPulse,
} from "lucide-react";

/* ─── Feature cards ─────────────────────────────────────────────── */
const features = [
  {
    icon: Dumbbell,
    title: "Personalized Workout Plans",
    description:
      "AI generates targeted workout routines based on your fitness level, goals, and body profile — from HIIT to strength to mobility.",
    accent: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: Apple,
    title: "Custom Nutrition Plans",
    description:
      "Get a 5-day meal plan with detailed macros for every meal — breakfast, lunch, dinner, and snacks, calibrated to your body.",
    accent: "from-teal-500/20 to-cyan-500/20",
  },
  {
    icon: Target,
    title: "Goal-Specific Training",
    description:
      "Whether it's fat loss, muscle gain, strength, or endurance — every plan is precisely tailored to your exact fitness goal.",
    accent: "from-cyan-500/20 to-emerald-500/20",
  },
];

/* ─── Steps ──────────────────────────────────────────────────────── */
const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Enter Your Profile",
    description:
      "Tell us your age, height, weight, and gender. It takes 30 seconds.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Pick Your Goal & Level",
    description:
      "Choose from fat loss, muscle gain, and more. Select beginner, intermediate, or advanced.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Get Your Fitness Plan",
    description:
      "Receive a complete workout routine and 5-day nutrition plan with detailed macros — instantly.",
  },
];

/* ─── Pricing tiers ──────────────────────────────────────────────── */
const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Try FitFusion with 5 free credits on signup.",
    features: [
      "5 plan generations",
      "Workout + nutrition plans",
      "Plan history access",
    ],
    cta: "Get started",
    highlighted: false,
    comingSoon: false,
    contactSales: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For dedicated fitness enthusiasts.",
    features: [
      "50 plan generations / month",
      "Advanced goal tuning",
      "Full nutrition macro breakdowns",
      "Export plans as PDF",
      "Priority support",
    ],
    cta: "Coming Soon",
    highlighted: true,
    comingSoon: true,
    contactSales: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For gyms, trainers, and wellness teams.",
    features: [
      "Everything in Pro",
      "Bulk plan generation",
      "API access",
      "Custom branding",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    highlighted: false,
    comingSoon: false,
    contactSales: true,
  },
];

/* ─── Stat highlights ────────────────────────────────────────────── */
const stats = [
  { value: "10K+", label: "Plans generated" },
  { value: "<60s", label: "Generation time" },
  { value: "5", label: "Free credits" },
];

/* ─── Page ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex min-h-[60vh] items-center overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-20 md:min-h-[80vh] lg:pt-48 lg:pb-32">
          {/* Background image */}
          <div className="absolute inset-0 -z-10 bg-black">
            <img
              src="/fitfusion_hero_bg.png"
              alt=""
              className="h-full w-full object-cover object-top-right md:object-center"
            />
            <div className="absolute inset-0 bg-black/70 md:bg-transparent md:bg-linear-to-r md:from-black/80 md:via-black/60 md:to-black/30" />
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-emerald-300">
                <Zap className="h-4 w-4" />
                AI-Powered Fitness Plans
              </div>

              <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-8xl">
                Your perfect fitness plan,{" "}
                <span className="text-[#059669]">powered by AI</span>
              </h1>

              <p className="mb-10 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg md:text-xl">
                Enter your profile, choose a fitness goal, and get a personalized
                workout routine plus 5-day nutrition plan — all generated by AI in
                under a minute.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button
                      size="lg"
                      className="gap-2 rounded-lg bg-emerald-600 px-8 py-4 text-base font-semibold text-white hover:bg-emerald-700"
                    >
                      Start for free
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 rounded-lg bg-emerald-600 px-8 py-4 text-base font-semibold text-white hover:bg-emerald-700"
                  >
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </SignedIn>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 rounded-lg border-gray-500 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-gray-800"
                  asChild
                >
                  <Link href="/#how-it-works">
                    See how it works
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <Badge variant="outline" className="mb-4">
                <Flame className="mr-1.5 h-3.5 w-3.5" />
                Features
              </Badge>
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to reach your goals
              </h2>
              <p className="mx-auto max-w-xl text-muted-foreground md:text-lg">
                Our AI does the heavy lifting so you can focus on your training.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description, accent }) => (
                <Card
                  key={title}
                  className="group relative overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  {/* Gradient accent */}
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${accent} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                  <CardHeader className="relative">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-muted/30 px-4 py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <Badge variant="outline" className="mb-4">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                How it works
              </Badge>
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                Three steps to your fitness plan
              </h2>
              <p className="mx-auto max-w-xl text-muted-foreground md:text-lg">
                Get your personalized workout and nutrition plan in under 60
                seconds.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map(({ icon: Icon, step, title, description }, i) => (
                <div key={step} className="relative flex flex-col items-center text-center">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+3rem)] top-8 hidden h-px w-[calc(100%-6rem)] bg-linear-to-r from-primary/40 to-primary/10 md:block" />
                  )}
                  <div className="relative mb-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-4 py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <Badge variant="outline" className="mb-4">
                Pricing
              </Badge>
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mx-auto max-w-xl text-muted-foreground md:text-lg">
                Start free with 5 credits. Upgrade when you&apos;re ready.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={
                    plan.highlighted
                      ? "relative border-primary shadow-lg shadow-primary/10"
                      : "border-border/50"
                  }
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="shadow-sm">Most popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-extrabold">
                        {plan.price}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">
                        / {plan.period}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2.5 text-sm"
                        >
                          <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.comingSoon ? (
                      <Button className="w-full" variant="default" disabled>
                        Coming Soon
                      </Button>
                    ) : plan.contactSales ? (
                      <ContactDialog>
                        <Button className="w-full" variant="outline">
                          Contact sales
                        </Button>
                      </ContactDialog>
                    ) : (
                      <>
                        <SignedOut>
                          <SignInButton mode="modal">
                            <Button className="w-full" variant="outline">
                              {plan.cta}
                            </Button>
                          </SignInButton>
                        </SignedOut>
                        <SignedIn>
                          <Button asChild className="w-full" variant="outline">
                            <Link href="/dashboard">{plan.cta}</Link>
                          </Button>
                        </SignedIn>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="relative overflow-hidden bg-primary px-4 py-16 text-primary-foreground">
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="container relative z-10 mx-auto max-w-3xl text-center">
            <HeartPulse className="mx-auto mb-4 h-10 w-10 opacity-80" />
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Ready to transform your fitness?
            </h2>
            <p className="mb-8 text-primary-foreground/80">
              Join thousands already using FitFusion to reach their goals.
            </p>
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" variant="secondary" className="gap-2 px-8">
                  Get started for free <ArrowRight className="h-4 w-4" />
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 px-8"
              >
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </SignedIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
