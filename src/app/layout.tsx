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
    default: "FitFusion — AI-Powered Fitness Plans Tailored to You",
    template: "%s — FitFusion",
  },
  description:
    "Generate personalized workout and nutrition plans powered by AI. Enter your profile, pick a goal, and get a complete fitness plan in seconds.",
  keywords: [
    "AI fitness plan",
    "personalized workout",
    "AI nutrition plan",
    "fitness app",
    "AI personal trainer",
  ],
  authors: [{ name: "FitFusion" }],
  creator: "FitFusion",
  publisher: "FitFusion",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FitFusion",
    title: "FitFusion — AI-Powered Fitness Plans Tailored to You",
    description:
      "Generate personalized workout and nutrition plans powered by AI. Enter your profile, pick a goal, and get a complete fitness plan in seconds.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitFusion — AI-Powered Fitness Plans Tailored to You",
    description:
      "Generate personalized workout and nutrition plans powered by AI. Enter your profile, pick a goal, and get a complete fitness plan in seconds.",
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
