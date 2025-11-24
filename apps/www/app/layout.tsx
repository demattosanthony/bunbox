import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeScript = `
    (function() {
      try {
        var savedTheme = localStorage.getItem("bunbox-ui-theme");
        var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        var theme = savedTheme || "system";
        
        var root = document.documentElement;
        root.classList.remove("light", "dark");
        
        if (theme === "system") {
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      } catch (e) {}
    })();
  `;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </div>
    </>
  );
}
