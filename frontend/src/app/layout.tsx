import type { Metadata } from "next";
import { JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "JustGetDomain — Available Domain Names, Already Found For You",
  description:
    "Stop guessing if a domain is taken. JustGetDomain pre-scans every short domain combination and hands you only the ones that are actually available. 3, 4, 5-letter domains — already checked.",
  robots: "index, follow",
  alternates: {
    canonical: "https://justgetdomain.com/",
  },
  openGraph: {
    title: "JustGetDomain — Every Available Short Domain, Already Found",
    description:
      "We crawl every 3, 4, and 5-letter domain so you don't have to. Browse only what's available. No guessing, no taken results, no frustration.",
    type: "website",
    url: "https://justgetdomain.com/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='%23050505'/%3E%3Ctext x='105' y='340' font-family='Courier New,monospace' font-weight='700' font-size='280' fill='%2300ff41' letter-spacing='-15'%3E%26gt;_%3C/text%3E%3Ccircle cx='385' cy='375' r='20' fill='%2300ff41'/%3E%3C/svg%3E" />A
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
