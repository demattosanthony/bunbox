"use server";

import { getDoc } from "@/lib/docs";
import { MarkdownContent } from "@/components/markdown-content";
import type { PageMetadata } from "@ademattos/bunbox";

interface DocsPageProps {
  params: { slug: string };
}

export async function metadata({
  params,
}: DocsPageProps): Promise<PageMetadata> {
  const doc = await getDoc(params.slug);
  return {
    title: doc?.metadata.title
      ? `${doc.metadata.title} - Bunbox Documentation`
      : "Bunbox Documentation",
    description: doc?.metadata.description || "Bunbox documentation",
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const doc = await getDoc(params.slug);

  if (!doc) {
    return (
      <div className="py-10">
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground">
          The documentation page you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <article className="py-6">
      <h1 className="text-4xl font-bold tracking-tight mb-2">
        {doc.metadata.title}
      </h1>
      {doc.metadata.description && (
        <p className="text-lg text-muted-foreground mb-8">
          {doc.metadata.description}
        </p>
      )}
      <MarkdownContent content={doc.content} />
    </article>
  );
}
