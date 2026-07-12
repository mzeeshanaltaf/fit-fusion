import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Have a question or feedback about FitFusion? Send us a message and we'll get back to you shortly.",
  alternates: { canonical: "/contact" },
};

// Short error codes set by the API route's redirect (?error=...) mapped to
// human-readable copy. Keep keys in sync with the route handler's fail() calls.
const ERROR_MESSAGES: Record<string, string> = {
  fields: "Please fill in all fields.",
  email: "Please enter a valid email address.",
  length: "Message must be 1000 characters or fewer.",
  rate: "Too many submissions. Please try again later.",
  server: "Service is temporarily unavailable. Please try again later.",
  parse: "Invalid submission. Please try again.",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;
  const initialError = error
    ? ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-xl">
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Contact Us
              </h1>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Have a question or feedback? Send us a message and we&apos;ll get
                back to you shortly.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
              <ContactForm initialSuccess={!!sent} initialError={initialError} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
