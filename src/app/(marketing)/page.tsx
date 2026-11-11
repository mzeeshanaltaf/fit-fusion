import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Fill } from "@/components/ui/fill";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { AuthCta } from "@/components/auth/auth-cta";
import { AssembleHeadline } from "@/components/marketing/assemble-headline";
import { HeroPlan } from "@/components/marketing/hero-plan";
import { Ticker } from "@/components/marketing/ticker";
import { PlanSequence } from "@/components/marketing/plan-sequence";
import { LibraryNumbers } from "@/components/marketing/library-numbers";
import { NutritionDay } from "@/components/marketing/nutrition-day";
import { ScrollWidth } from "@/components/marketing/scroll-width";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "FitFusion",
                  url: "https://fitfusion.zeeshanai.cloud",
                  logo: "https://fitfusion.zeeshanai.cloud/icon",
                  sameAs: [],
                },
                {
                  "@type": "WebSite",
                  name: "FitFusion",
                  url: "https://fitfusion.zeeshanai.cloud",
                },
                {
                  "@type": "SoftwareApplication",
                  name: "FitFusion",
                  applicationCategory: "HealthApplication",
                  operatingSystem: "Web",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                  },
                },
              ],
            }),
          }}
        />

        {/* 1. Hero with a live sample plan */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-10 lg:pt-20 lg:pb-24">
          <div className="grid gap-8">
            <AssembleHeadline lines={["Your", "plan."]} accentLast />
            <p className="t-lead">
              Enter your age, weight, goal and equipment. In about 30 seconds
              you get workouts picked from 250 real ones, and 5 days of meals
              built around your calorie target.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AuthCta
                loggedOutLabel="Start free"
                loggedInLabel="Go to dashboard"
                size="xl"
                className="w-full sm:w-auto"
              />
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/#how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="t-small text-muted-foreground">
              10 free plans when you sign up. No card.
            </p>
          </div>

          <HeroPlan />
        </section>

        {/* 2. Exercise ticker */}
        <Ticker />

        {/* 3. Profile to plan, driven by scroll */}
        <section id="how-it-works" aria-label="How it works" className="scroll-mt-16">
          <PlanSequence />
        </section>

        {/* 4. Library in real numbers */}
        <LibraryNumbers />

        {/* 5. A nutrition day as a table */}
        <NutritionDay />

        {/* 6. Closing call to action */}
        <Fill tone="vermilion" aria-labelledby="cta-title">
          <div className="grid gap-8">
            <ScrollWidth as="h2" className="t-headline max-w-4xl" from={62} to={80}>
              <span id="cta-title">10 free plans when you sign up.</span>
            </ScrollWidth>
            <p className="t-lead">
              A plan takes about 30 seconds and costs 1 credit. Sign up, fill in
              your profile, and train from it tomorrow.
            </p>
            <div>
              <AuthCta
                loggedOutLabel="Start free"
                loggedInLabel="Go to dashboard"
                size="xl"
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </Fill>
      </main>

      <Footer />
    </div>
  );
}
