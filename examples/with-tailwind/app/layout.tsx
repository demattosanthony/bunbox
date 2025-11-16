"use server";

import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";
import "./index.css";

export const metadata: PageMetadata = {
  title: "Bunbox with Tailwind CSS Example",
  description:
    "A full-stack framework built on Bun with Tailwind CSS - 100x simpler than Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="main">{children}</main>;
}
