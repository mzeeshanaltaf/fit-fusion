import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

const EFFECTIVE_DATE = "March 1, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-16">
        <div className="container mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mb-10 text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE}
          </p>

          <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                1. Introduction
              </h2>
              <p>
                FitFusion (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
                is committed to protecting your personal information. This
                Privacy Policy explains what data we collect, how we use it, and
                your rights regarding that data when you use our website and
                services at fitfusion.app.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                2. Information We Collect
              </h2>
              <p className="mb-3">
                We collect information you provide directly and information
                generated as you use the service:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Account data</strong> —
                  name, email address, and authentication credentials managed by
                  Clerk.
                </li>
                <li>
                  <strong className="text-foreground">Profile data</strong> —
                  age, weight, height, gender, fitness goal, and training level
                  that you enter when generating a plan.
                </li>
                <li>
                  <strong className="text-foreground">
                    Generated plan data
                  </strong>{" "}
                  — workout and nutrition plans produced by our AI and stored
                  against your account.
                </li>
                <li>
                  <strong className="text-foreground">Usage data</strong> —
                  pages visited, actions taken, and session metadata collected
                  automatically for service improvement.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>To generate and store your personalized fitness plans.</li>
                <li>To manage your account and credit balance.</li>
                <li>
                  To respond to support requests or contact form submissions.
                </li>
                <li>
                  To improve and maintain the quality of the FitFusion service.
                </li>
                <li>
                  To send transactional emails related to your account (e.g.,
                  sign-in notifications).
                </li>
              </ul>
              <p className="mt-3">
                We do <strong className="text-foreground">not</strong> sell your
                personal data to third parties or use it for advertising
                purposes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                4. Data Storage and Security
              </h2>
              <p>
                Your data is stored securely in our backend systems and is
                associated with your authenticated account. We use
                industry-standard encryption in transit (HTTPS) and at rest. API
                keys and secrets are never exposed to the client. While we take
                reasonable precautions, no system is completely secure and we
                cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                5. Third-Party Services
              </h2>
              <p className="mb-3">
                FitFusion uses the following third-party services:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Clerk</strong> — for
                  authentication and user management. See{" "}
                  <a
                    href="https://clerk.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    Clerk&apos;s Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong className="text-foreground">n8n</strong> — for AI
                  workflow processing of fitness plan generation requests.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                6. Your Rights
              </h2>
              <p className="mb-3">
                Depending on your jurisdiction, you may have the right to:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access the personal data we hold about you.</li>
                <li>Request correction of inaccurate data.</li>
                <li>
                  Request deletion of your account and associated data.
                </li>
                <li>Object to or restrict certain processing activities.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, please contact us using the
                  Contact form in the footer.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                7. Cookies
              </h2>
              <p>
                FitFusion uses session cookies required for authentication and
                maintaining your logged-in state. We do not use tracking or
                advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                8. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. When we do,
                we will revise the effective date at the top of this page. We
                encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">
                9. Contact
              </h2>
              <p>
                If you have questions about this Privacy Policy or how we handle
                your data, please reach out via the Contact form in the footer.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
