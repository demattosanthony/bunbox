/**
 * Server-side rendering for React components
 */

import React from "react";
import { renderToReadableStream } from "react-dom/server";
import type { PageMetadata, PageModule, LayoutModule } from "./types";
import { getFaviconContentType } from "./utils";

/**
 * Build hashes for cache-busted asset URLs
 */
export interface BuildHashes {
  clientHash?: string;
  stylesHash?: string;
}

/**
 * Generate asset URLs (hashed in production, fixed in development)
 */
function getAssetUrls(development: boolean, hashes?: BuildHashes) {
  return {
    client: development
      ? "/__bunbox/client.js"
      : `/__bunbox/client.${hashes?.clientHash || ""}.js`,
    styles:
      development || !hashes?.stylesHash
        ? "/__bunbox/styles.css"
        : `/__bunbox/styles.${hashes.stylesHash}.css`,
  };
}

/**
 * HMR WebSocket client script for development hot reload
 */
const HMR_SCRIPT = `(function() {
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
})();`;

/**
 * Theme script for flash-free dark mode (always injected, ~150 bytes)
 * Harmless no-op if ThemeProvider isn't used
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("bunbox-theme")||"system",d=document.documentElement,r=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":t;d.classList.add(r)}catch(e){}})();`;

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
 * Render a React component to HTML with SSR using streaming
 * Includes client bundle for hydration
 */
export async function renderPage(
  pageModule: PageModule,
  layoutModules: LayoutModule[],
  params: Record<string, string>,
  query: Record<string, string>,
  development: boolean = false,
  pathname: string = "/",
  buildHashes?: BuildHashes,
  loaderData?: unknown
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
    data: loaderData,
  });

  // Wrap with layouts from innermost to outermost
  for (let i = layoutModules.length - 1; i >= 0; i--) {
    const LayoutComponent = layoutModules[i]?.default;
    if (LayoutComponent) {
      content = React.createElement(LayoutComponent, { children: content });
    }
  }

  // HMR script for development
  const hmrScript = development
    ? React.createElement("script", {
        dangerouslySetInnerHTML: { __html: HMR_SCRIPT },
      })
    : null;

  // Initial state for client hydration
  const initScript = React.createElement("script", {
    dangerouslySetInnerHTML: {
      __html: `window.__BUNBOX_DATA__=${JSON.stringify({ params, query, pathname, loaderData })};`,
    },
  });

  const assets = getAssetUrls(development, buildHashes);

  // Wrap in full HTML document structure for SSR (using React.createElement to avoid JSX)
  const fullDocument = React.createElement(
    "html",
    { lang: "en" },
    React.createElement(
      "head",
      null,
      React.createElement("meta", { charSet: "UTF-8" }),
      React.createElement("meta", { name: "viewport", content: metadata.viewport }),
      React.createElement("title", null, metadata.title),
      // Theme script runs before stylesheet to prevent FOUC (always injected, harmless if unused)
      React.createElement("script", { dangerouslySetInnerHTML: { __html: THEME_SCRIPT } }),
      metadata.favicon &&
        React.createElement("link", {
          rel: "icon",
          type: getFaviconContentType(metadata.favicon),
          href: `/__bunbox/favicon${development ? `?v=${Date.now()}` : ""}`,
        }),
      metadata.favicon &&
        React.createElement("link", {
          rel: "shortcut icon",
          type: getFaviconContentType(metadata.favicon),
          href: `/__bunbox/favicon${development ? `?v=${Date.now()}` : ""}`,
        }),
      metadata.description &&
        React.createElement("meta", { name: "description", content: metadata.description }),
      metadata.keywords &&
        React.createElement("meta", { name: "keywords", content: metadata.keywords.join(", ") }),
      metadata.author &&
        React.createElement("meta", { name: "author", content: metadata.author }),
      React.createElement("link", { rel: "stylesheet", href: assets.styles })
    ),
    React.createElement(
      "body",
      null,
      React.createElement("div", { id: "root" }, content),
      initScript,
      React.createElement("script", { type: "module", src: assets.client }),
      hmrScript
    )
  );

  return await renderToReadableStream(fullDocument);
}
