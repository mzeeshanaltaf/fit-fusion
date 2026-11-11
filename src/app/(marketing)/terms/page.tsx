import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules for using FitFusion: what the plans are, what credits are, and what we are not responsible for.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" effective="November 11, 2026">
      <LegalSection title="1. Acceptance">
        <p>
          By using FitFusion (&quot;the Service&quot;) you agree to these
          terms. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. What the Service does">
        <p>
          FitFusion builds a workout plan and a 5-day nutrition plan from the
          profile you enter (age, weight, height, gender, goal, level, diet,
          allergies, equipment and training days). Workouts are chosen from a
          library; meals are written by an AI model to meet calorie and macro
          targets. Plans are general wellness information.
        </p>
      </LegalSection>

      <LegalSection title="3. Not medical advice">
        <p>
          Plans are <strong>not medical advice</strong>. Talk to a doctor or
          qualified professional before you start a new training or eating
          programme, especially if you are injured, pregnant, on medication or
          have a health condition. Meals are scanned for the allergens you list,
          but the scan can miss things: always read labels. FitFusion is not
          liable for injury or harm that follows from using a plan.
        </p>
      </LegalSection>

      <LegalSection title="4. Your account">
        <p>
          You need an account. Give accurate details, keep your password
          private, and you are responsible for what happens under your account.
          You must be at least 15 years old.
        </p>
      </LegalSection>

      <LegalSection title="5. Credits">
        <ul>
          <li>Every new account gets 10 free credits.</li>
          <li>Building a plan costs 1 credit.</li>
          <li>
            If a plan fails to build, the credit is returned to your balance.
            Deleting a finished plan does not return it.
          </li>
          <li>The Service is free to use. There are no paid plans.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for anything unlawful.</li>
          <li>Scrape, reverse-engineer or extract data from it in bulk.</li>
          <li>Generate plans with scripts or at scale.</li>
          <li>Share your login or make accounts to get around credit limits.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Ownership">
        <p>
          The FitFusion name, site and software belong to us. The plans we
          build for you are yours to use for your own training. Do not resell
          or republish them.
        </p>
      </LegalSection>

      <LegalSection title="8. No warranty">
        <p>
          The Service is provided &quot;as is&quot;. We do not promise it will
          always be available or error-free, or that a plan will get you a
          particular result.
        </p>
      </LegalSection>

      <LegalSection title="9. Limit of liability">
        <p>
          To the extent the law allows, FitFusion is not liable for indirect or
          consequential damage, including injury, lost data or lost money,
          arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection title="10. Ending your account">
        <p>
          We can suspend or close an account that breaks these terms. You can
          ask us to delete yours at any time through the{" "}
          <a href="/contact">contact form</a>.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          If these terms change, the effective date above changes with them.
          Using the Service after that means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions about these terms: use the <a href="/contact">contact form</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
