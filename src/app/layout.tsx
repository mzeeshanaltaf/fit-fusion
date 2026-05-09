import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geist.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
