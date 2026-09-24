import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Linked — Celebrity Relationship Timelines",
    template: "%s | Linked",
  },
  description:
    "Search any celebrity and see their full relationship history laid out as a timeline — who they dated, who they married, when it started and how long it lasted. Powered by Wikidata.",
  keywords: [
    "celebrity relationships",
    "celebrity dating history",
    "celebrity timeline",
    "who dated who celebrity",
    "celebrity marriage history",
    "famous couples",
    "relationship timeline",
    "celebrity love life",
  ],
  authors: [{ name: "Linked" }],
  creator: "Linked",
  publisher: "Linked",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    siteName: "Linked",
    url: siteUrl,
    title: "Linked — Celebrity Relationship Timelines",
    description:
      "Search any celebrity and see their full relationship history laid out as a timeline — who they dated, when it started, how long it lasted.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linked — Celebrity Relationship Timelines",
    description:
      "Search any celebrity and see their full relationship history laid out as a timeline.",
    site: "@linked",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-body bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
