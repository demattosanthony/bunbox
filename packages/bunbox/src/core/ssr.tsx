/**
 * Server-side rendering for React components
 */

import React from "react";
import { renderToReadableStream } from "react-dom/server";
import type { PageMetadata, PageModule, LayoutModule } from "./types";
import { readFile, getFaviconContentType } from "./utils";

/**
 * Merge metadata with page metadata taking precedence
 */
function mergeMetadata(
  pageMetadata: PageMetadata,
  layoutMetadata: PageMetadata
): PageMetadata {
  return {
    title: pageMetadata.title ?? layoutMetadata.title ?? "Bunbox App",
    description: pageMetadata.description ?? layoutMetadata.description ?? "",
    viewport:
      pageMetadata.viewport ??
      layoutMetadata.viewport ??
      "width=device-width, initial-scale=1.0",
    keywords: pageMetadata.keywords ?? layoutMetadata.keywords,
    author: pageMetadata.author ?? layoutMetadata.author,
    favicon: pageMetadata.favicon ?? layoutMetadata.favicon,
  };
}

/**
 * Check if a file has "use server" directive
 */
export async function checkUseServer(filePath: string): Promise<boolean> {
  const content = await readFile(filePath);
  if (!content) return false;

  // Check for "use server" at the top of the file (within first few lines)
  const lines = content.split("\n").slice(0, 5);
  return lines.some((line) => line.trim().match(/^["']use server["'];?$/));
}

/**
 * Render a React component to HTML with SSR using streaming
 */
export async function renderPage(
  pageModule: PageModule,
  layoutModules: LayoutModule[],
  params: Record<string, string>,
  query: Record<string, string>,
  development: boolean = false
): Promise<ReadableStream> {
  const PageComponent = pageModule.default;

  if (!PageComponent) {
    throw new Error("Page module must export a default component");
  }

  // Merge metadata with page taking precedence
  const metadata = mergeMetadata(
    pageModule.metadata || {},
    layoutModules[0]?.metadata || {}
  );

  // Build the component tree with layouts
  let content: React.ReactElement = React.createElement(PageComponent, {
    params,
    query,
  });

  // Wrap with layouts from innermost to outermost
  for (let i = layoutModules.length - 1; i >= 0; i--) {
    const LayoutComponent = layoutModules[i]?.default;
    if (LayoutComponent) {
      content = React.createElement(LayoutComponent, { children: content });
    }
  }

  // HMR script for development
  const hmrScript = development ? (
    <script
      dangerouslySetInnerHTML={{
        __html: `
      (function() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host + '/__bunbox/hmr');
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            console.log('🔄 Hot reload triggered');
            window.location.reload();
          }
        };
        ws.onerror = () => console.log('⚠️ HMR connection failed');
        ws.onclose = () => console.log('🔌 HMR disconnected');
      })();
    `,
      }}
    />
  ) : null;

  // Wrap in full HTML document structure for SSR
  const fullDocument = (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content={metadata.viewport} />
        <title>{metadata.title}</title>
        {metadata.description && (
          <meta name="description" content={metadata.description} />
        )}
        {metadata.keywords && (
          <meta name="keywords" content={metadata.keywords.join(", ")} />
        )}
        {metadata.author && <meta name="author" content={metadata.author} />}
        {metadata.favicon && (
          <link
            rel="icon"
            type={getFaviconContentType(metadata.favicon)}
            href="/__bunbox/favicon"
          />
        )}
        <link rel="stylesheet" href="/__bunbox/styles.css" />
      </head>
      <body>
        <div id="root">{content}</div>
        {hmrScript}
      </body>
    </html>
  );

  return await renderToReadableStream(fullDocument);
}

/**
 * Generate HTML shell for client-side hydration
 * Used for pages without "use server" directive
 */
export function generateHTMLShell(
  params: Record<string, string>,
  query: Record<string, string>,
  metadata: PageMetadata = {},
  development: boolean = false
): string {
  const merged = mergeMetadata(metadata, {});

  // Build meta tags
  const metaTags: string[] = [];
  if (merged.description) {
    metaTags.push(
      `<meta name="description" content="${merged.description}" />`
    );
  }
  if (merged.keywords?.length) {
    metaTags.push(
      `<meta name="keywords" content="${merged.keywords.join(", ")}" />`
    );
  }
  if (merged.author) {
    metaTags.push(`<meta name="author" content="${merged.author}" />`);
  }
  const metaTagsStr =
    metaTags.length > 0 ? "\n    " + metaTags.join("\n    ") : "";

  // Build favicon tag
  const faviconTag = merged.favicon
    ? `\n    <link rel="icon" type="${getFaviconContentType(
        merged.favicon
      )}" href="/__bunbox/favicon" />`
    : "";

  // Build HMR script
  const hmrScript = development
    ? `
    <script>
      // HMR WebSocket connection
      (function() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host + '/__bunbox/hmr');
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            console.log('🔄 Hot reload triggered');
            window.location.reload();
          }
        };
        ws.onerror = () => console.log('⚠️ HMR connection failed');
        ws.onclose = () => console.log('🔌 HMR disconnected');
      })();
    </script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="${merged.viewport}" />
    <title>${merged.title}</title>${metaTagsStr}${faviconTag}
    <link rel="stylesheet" href="/__bunbox/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>window.__BUNBOX_DATA__ = ${JSON.stringify({
      params,
      query,
    })};</script>
    <script type="module" src="/__bunbox/client.js"></script>${hmrScript}
  </body>
</html>`;
}
