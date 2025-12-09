import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";
import "./index.css";

export const metadata: PageMetadata = {
  title: "{{projectName}}",
  description: "A full-featured Bunbox application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="main">{children}</main>;
}
