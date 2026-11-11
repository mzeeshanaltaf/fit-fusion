import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a bug, ask a question or send feedback about FitFusion.",
  alternates: { canonical: "/contact" },
};

// Short error codes set by the API route's redirect (?error=...) mapped to
// human-readable copy. Keep keys in sync with the route handler's fail() calls.
const ERROR_MESSAGES: Record<string, string> = {
  fields: "Fill in your name, email and message, then send again.",
  email: "That email address looks wrong. Check it and send again.",
  length: "The message is over 1,000 characters. Shorten it and send again.",
  rate: "Too many messages in a short time. Wait a few minutes and try again.",
  server: "Sending failed on our side. Try again in a few minutes.",
  parse: "The form could not be read. Reload the page and send again.",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;
  const initialError = error
    ? ERROR_MESSAGES[error] ?? "Something went wrong. Try again."
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="grid content-start gap-6">
            <p className="t-label text-signal">Contact</p>
            <h1 className="t-headline">Tell us.</h1>
            <p className="t-lead">
              A bug, a question, a workout that does not fit. Say what you were
              doing and what happened. If it is about a plan, name the
              workout.
            </p>
          </div>

          <div className="border-t-2 border-foreground pt-6">
            <ContactForm initialSuccess={!!sent} initialError={initialError} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
