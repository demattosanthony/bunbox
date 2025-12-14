import type { PageMetadata } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "Bunbox Middleware Auth Example",
  description: "Authentication and authorization using middleware",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
