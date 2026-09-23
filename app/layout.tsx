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
    "Search any celebrity and see their full relationship history laid out as a timeline — who they dated, when it started, how long it lasted.",
  openGraph: {
    type: "website",
    siteName: "Linked",
    title: "Linked — Celebrity Relationship Timelines",
    description:
      "Search any celebrity and see their full relationship history laid out as a timeline.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linked — Celebrity Relationship Timelines",
    description:
      "Search any celebrity and see their full relationship history laid out as a timeline.",
  },
  robots: {
    index: true,
    follow: true,
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
