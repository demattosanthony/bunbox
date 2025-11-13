"use server";

import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";
import "./index.css";

export const metadata: PageMetadata = {
  title: "Bunbox Sample App",
  description:
    "A full-stack framework built on Bun - 100x simpler than Next.js",
  favicon: "icon.svg",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="main">{children}</main>;
}
