"use server";

import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";
import "./index.css";

export const metadata: PageMetadata = {
  title: "{{projectName}}",
  description: "A Bunbox application with Tailwind CSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main>{children}</main>;
}
