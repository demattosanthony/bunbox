/**
 * Server-side rendering for React components
 */

import React from "react";
import { renderToReadableStream } from "react-dom/server";

export interface SSRContext {
  params: Record<string, string>;
  query: Record<string, string>;
  url: string;
}

/**
 * Check if a file has "use server" directive
 */
export async function checkUseServer(filePath: string): Promise<boolean> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) return false;

    const content = await file.text();
    // Check for "use server" at the top of the file (within first few lines)
    const lines = content.split("\n").slice(0, 5);
    return lines.some((line) => line.trim().match(/^["']use server["'];?$/));
  } catch (error) {
    return false;
  }
}

/**
 * Render a React component to HTML with SSR using Bun's optimized streaming
 */
export async function renderPage(
  pageModule: any,
  layoutModules: any[],
  context: SSRContext
): Promise<ReadableStream> {
  const PageComponent = pageModule.default;

  if (!PageComponent) {
    throw new Error("Page module must export a default component");
  }

  // Build the component tree with layouts
  let content: React.ReactElement = React.createElement(PageComponent, context);

  // Wrap with layouts from innermost to outermost
  for (let i = layoutModules.length - 1; i >= 0; i--) {
    const LayoutComponent = layoutModules[i]?.default;
    if (LayoutComponent) {
      content = React.createElement(LayoutComponent, {
        children: content,
      });
    }
  }

  // Render to ReadableStream (optimized for Bun)
  const stream = await renderToReadableStream(content);

  return stream;
}

/**
 * Create HTML document wrapper component
 */
export function Document({
  children,
  context,
}: {
  children: React.ReactNode;
  context: SSRContext;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bunbox App</title>
      </head>
      <body>
        <div id="root">{children}</div>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BUNBOX_DATA__ = ${JSON.stringify(context)};`,
          }}
        />
      </body>
    </html>
  );
}
