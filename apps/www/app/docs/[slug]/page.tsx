import { getDoc } from "@/lib/docs";
import { MarkdownContent } from "@/components/markdown-content";
import type { PageMetadata, LoaderContext, PageProps } from "@ademattos/bunbox";

export async function loader({ params }: LoaderContext) {
  const doc = await getDoc(params.slug as string);
  return { doc };
}

export const metadata: PageMetadata = {
  title: "Bunbox Documentation",
  description: "Bunbox documentation",
};

interface DocData {
  doc: {
    metadata: { title: string; description?: string };
    content: string;
  } | null;
}

export default function DocsPage({ data }: PageProps) {
  const { doc } = data as DocData;

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
    <article className="py-6 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        {doc.metadata.title}
      </h1>
      {doc.metadata.description && (
        <p className="text-base text-muted-foreground mb-6">
          {doc.metadata.description}
        </p>
      )}
      <MarkdownContent content={doc.content} />
    </article>
  );
}
