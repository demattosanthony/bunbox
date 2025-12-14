import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";
import { ThemeProvider } from "@ademattos/bunbox/theme";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import "./index.css";

export const metadata: PageMetadata = {
  title: "Bunbox - A Simple Full-Stack Framework Built on Bun",
  description:
    "Bunbox is a simple full-stack framework built on Bun. 100x simpler than Next.js with file-based routing, SSR, API routes, and WebSocket support.",
  viewport: "width=device-width, initial-scale=1.0",
  keywords: [
    "bun",
    "framework",
    "react",
    "ssr",
    "websocket",
    "api",
    "fullstack",
  ],
  author: "Anthony Demattos",
  favicon: "icon.svg",
  metadataBase: "https://bunbox.org",
  openGraph: {
    siteName: "Bunbox",
    locale: "en_US",
    image: {
      url: "/bunbox.png",
      width: 1200,
      height: 630,
      alt: "Bunbox - A Simple Full-Stack Framework Built on Bun",
    },
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
