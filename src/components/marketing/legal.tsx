import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

/** Shared shell for the privacy and terms pages: one ruled reading column. */
export function LegalPage({
  title,
  effective,
  children,
}: {
  title: string;
  effective: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="t-label text-signal">Legal</p>
          <h1 className="t-headline mt-3">{title}</h1>
          <p className="t-small mt-4 text-muted-foreground">
            Effective {effective}
          </p>
          <div className="mt-10 max-w-3xl border-t-2 border-foreground">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-b border-border py-7 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_p]:max-w-prose [&_strong]:font-bold [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5">
      <h2 className="t-heading">{title}</h2>
      <div className="t-body grid gap-3">{children}</div>
    </section>
  );
}
