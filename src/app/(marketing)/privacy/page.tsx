import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What FitFusion collects, why, who processes it, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effective="November 11, 2026">
      <LegalSection title="1. Who this covers">
        <p>
          FitFusion (&quot;we&quot;, &quot;us&quot;) runs this website at
          fitfusion.zeeshanai.cloud. This policy says what we collect, what we
          do with it and who else touches it.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul>
          <li>
            <strong>Account data:</strong> name, email address and a hashed
            password, or your Google account identifier if you sign in with
            Google.
          </li>
          <li>
            <strong>Profile data:</strong> age, weight, height, gender, goal,
            training level, diet, allergies, equipment and training days, as you
            enter them to build a plan.
          </li>
          <li>
            <strong>Plan data:</strong> the workout and nutrition plans we build
            for you, and your credit balance and history.
          </li>
          <li>
            <strong>Messages:</strong> name, email and text you send through
            the contact form.
          </li>
          <li>
            <strong>Usage data:</strong> page views and basic device information,
            counted by our analytics tool. See section 6.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What we use it for">
        <ul>
          <li>To build, store and show your plans.</li>
          <li>To run your account, sign-in and credits.</li>
          <li>To email you sign-in and password codes.</li>
          <li>To answer messages you send us.</li>
          <li>To see which pages are used and fix what is broken.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your data and we do not use it for
          advertising.
        </p>
      </LegalSection>

      <LegalSection title="4. Who processes it for us">
        <ul>
          <li>
            <strong>OpenAI:</strong> when you build a plan, your profile inputs
            (age, weight, height, gender, goal, level, diet, allergies,
            equipment, training days) are sent to an OpenAI model that picks
            workouts and writes meals. Your name and email are not sent.
          </li>
          <li>
            <strong>Resend:</strong> delivers the six-digit codes we email you.
            It receives your email address.
          </li>
          <li>
            <strong>Google:</strong> only if you choose &quot;Continue with
            Google&quot;. See{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s privacy policy
            </a>
            .
          </li>
          <li>
            <strong>n8n:</strong> receives the messages you send through the
            contact form.
          </li>
          <li>
            <strong>Upstash:</strong> counts contact-form submissions per IP
            address to limit spam.
          </li>
        </ul>
        <p>
          Sign-in (Better Auth), the database and the analytics tool run on a
          server we operate.
        </p>
      </LegalSection>

      <LegalSection title="5. Storage and security">
        <p>
          Data is stored in our database and sent over HTTPS. Passwords are
          stored hashed. Secrets and API keys stay on the server and are never
          sent to your browser. No system is completely secure, and we cannot
          promise that it is.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and analytics">
        <p>
          We set the cookies needed to keep you signed in and to remember
          light or dark mode. Our analytics tool (Umami, self-hosted) counts
          visits without cookies and without following you across sites. There
          are no advertising cookies.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          Depending on where you live, you can ask to see the data we hold
          about you, correct it, delete your account and its data, or object to
          how we use it. Use the <a href="/contact">contact form</a> and say
          which one. Deleting a plan from your dashboard removes that plan
          straight away.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes">
        <p>
          If this policy changes, the effective date above changes with it.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Questions about this policy: use the <a href="/contact">contact form</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
