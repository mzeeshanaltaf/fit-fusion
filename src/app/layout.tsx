import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

// Variable Archivo with the width axis: condensed + heavy for headlines and
// numbers, normal width for reading. Weight (100-900) is variable by default.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fitfusion.zeeshanai.cloud"),
  title: {
    default: "FitFusion | Workout and meal plans built from your profile",
    template: "%s | FitFusion",
  },
  description:
    "Enter your profile and get a workout plan picked from 250 real workouts, plus 5 days of meals built around your calorie target. 10 free plans when you sign up.",
  keywords: [
    "workout plan generator",
    "personalized workout plan",
    "meal plan with macros",
    "fitness plan",
    "free workout plan",
  ],
  authors: [{ name: "FitFusion" }],
  creator: "FitFusion",
  publisher: "FitFusion",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FitFusion",
    title: "FitFusion | Workout and meal plans built from your profile",
    description:
      "Enter your profile and get a workout plan picked from 250 real workouts, plus 5 days of meals built around your calorie target. 10 free plans when you sign up.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitFusion | Workout and meal plans built from your profile",
    description:
      "Enter your profile and get a workout plan picked from 250 real workouts, plus 5 days of meals built around your calorie target. 10 free plans when you sign up.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${archivo.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
        {umamiSrc && umamiWebsiteId && (
          <Script
            defer
            src={umamiSrc}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
