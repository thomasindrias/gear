import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gear.sh";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gear — Share & Switch Agent Configs",
    template: "%s | Gear",
  },
  description:
    "Discover, share, and hot-swap AI agent configurations. Like nvm, but for agentic environments.",
  openGraph: {
    type: "website",
    siteName: "Gear",
    title: "Gear — Share & Switch Agent Configs",
    description:
      "Discover, share, and hot-swap AI agent configurations. Like nvm, but for agentic environments.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-neutral-950 text-neutral-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
