import type { PageMetadata } from "@ademattos/bunbox";
import "./index.css";

export const metadata: PageMetadata = {
  title: "Bunbox Middleware Auth",
  description: "Authentication and authorization using middleware",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main>{children}</main>;
}
