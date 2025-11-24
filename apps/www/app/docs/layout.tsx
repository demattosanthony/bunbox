import React from "react";
import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-7xl px-6 py-10">
      <div className="flex gap-10">
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

