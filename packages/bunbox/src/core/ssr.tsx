/**
 * Server-side rendering for React components
 */

import React from "react";
import { renderToReadableStream } from "react-dom/server";
import type {
  PageMetadata,
  PageModule,
  LayoutModule,
  OpenGraphMetadata,
  OpenGraphImage,
  TwitterMetadata,
} from "./types";
import { getFaviconContentType, resolveMetadataUrl } from "./utils";

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
 * Deep merge Open Graph metadata with page taking precedence
 */
function mergeOpenGraph(
  page: OpenGraphMetadata | undefined,
  layout: OpenGraphMetadata | undefined
): OpenGraphMetadata | undefined {
  if (!page && !layout) return undefined;
  return {
    title: page?.title ?? layout?.title,
    description: page?.description ?? layout?.description,
    image: page?.image ?? layout?.image,
    url: page?.url ?? layout?.url,
    type: page?.type ?? layout?.type,
    siteName: page?.siteName ?? layout?.siteName,
    locale: page?.locale ?? layout?.locale,
  };
}

/**
 * Deep merge Twitter metadata with page taking precedence
 */
function mergeTwitter(
  page: TwitterMetadata | undefined,
  layout: TwitterMetadata | undefined
): TwitterMetadata | undefined {
  if (!page && !layout) return undefined;
  return {
    card: page?.card ?? layout?.card,
    title: page?.title ?? layout?.title,
    description: page?.description ?? layout?.description,
    image: page?.image ?? layout?.image,
    site: page?.site ?? layout?.site,
    creator: page?.creator ?? layout?.creator,
  };
}

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
    metadataBase: pageMetadata.metadataBase ?? layoutMetadata.metadataBase,
    openGraph: mergeOpenGraph(pageMetadata.openGraph, layoutMetadata.openGraph),
    twitter: mergeTwitter(pageMetadata.twitter, layoutMetadata.twitter),
  };
}

/**
 * Render Open Graph meta tags
 */
function renderOpenGraphTags(
  og: OpenGraphMetadata | undefined,
  fallbackTitle: string,
  fallbackDescription: string,
  metadataBase: string | undefined,
  pathname: string
): React.ReactElement[] {
  const tags: React.ReactElement[] = [];

  // og:title - falls back to page title
  const title = og?.title ?? fallbackTitle;
  if (title) {
    tags.push(
      React.createElement("meta", {
        key: "og:title",
        property: "og:title",
        content: title,
      })
    );
  }

  // og:description - falls back to page description
  const description = og?.description ?? fallbackDescription;
  if (description) {
    tags.push(
      React.createElement("meta", {
        key: "og:description",
        property: "og:description",
        content: description,
      })
    );
  }

  // og:url - auto-generate from metadataBase + pathname if not set
  const url = resolveMetadataUrl(og?.url ?? pathname, metadataBase);
  if (url) {
    tags.push(
      React.createElement("meta", {
        key: "og:url",
        property: "og:url",
        content: url,
      })
    );
  }

  // og:image with optional dimensions
  if (og?.image) {
    const imageData: OpenGraphImage =
      typeof og.image === "string" ? { url: og.image } : og.image;
    const imageUrl = resolveMetadataUrl(imageData.url, metadataBase);

    if (imageUrl) {
      tags.push(
        React.createElement("meta", {
          key: "og:image",
          property: "og:image",
          content: imageUrl,
        })
      );

      if (imageData.width) {
        tags.push(
          React.createElement("meta", {
            key: "og:image:width",
            property: "og:image:width",
            content: String(imageData.width),
          })
        );
      }
      if (imageData.height) {
        tags.push(
          React.createElement("meta", {
            key: "og:image:height",
            property: "og:image:height",
            content: String(imageData.height),
          })
        );
      }
      if (imageData.alt) {
        tags.push(
          React.createElement("meta", {
            key: "og:image:alt",
            property: "og:image:alt",
            content: imageData.alt,
          })
        );
      }
    }
  }

  // og:type - defaults to "website"
  const type = og?.type ?? "website";
  tags.push(
    React.createElement("meta", {
      key: "og:type",
      property: "og:type",
      content: type,
    })
  );

  // og:site_name
  if (og?.siteName) {
    tags.push(
      React.createElement("meta", {
        key: "og:site_name",
        property: "og:site_name",
        content: og.siteName,
      })
    );
  }

  // og:locale
  if (og?.locale) {
    tags.push(
      React.createElement("meta", {
        key: "og:locale",
        property: "og:locale",
        content: og.locale,
      })
    );
  }

  return tags;
}

/**
 * Render Twitter Card meta tags
 */
function renderTwitterTags(
  twitter: TwitterMetadata | undefined,
  og: OpenGraphMetadata | undefined,
  fallbackTitle: string,
  fallbackDescription: string,
  metadataBase: string | undefined
): React.ReactElement[] {
  const tags: React.ReactElement[] = [];

  // twitter:card - defaults to "summary_large_image"
  const card = twitter?.card ?? "summary_large_image";
  tags.push(
    React.createElement("meta", {
      key: "twitter:card",
      name: "twitter:card",
      content: card,
    })
  );

  // twitter:title - falls back to og:title, then page title
  const title = twitter?.title ?? og?.title ?? fallbackTitle;
  if (title) {
    tags.push(
      React.createElement("meta", {
        key: "twitter:title",
        name: "twitter:title",
        content: title,
      })
    );
  }

  // twitter:description - falls back to og:description, then page description
  const description = twitter?.description ?? og?.description ?? fallbackDescription;
  if (description) {
    tags.push(
      React.createElement("meta", {
        key: "twitter:description",
        name: "twitter:description",
        content: description,
      })
    );
  }

  // twitter:image - falls back to og:image
  const imageSource = twitter?.image ?? og?.image;
  if (imageSource) {
    const imageData =
      typeof imageSource === "string" ? { url: imageSource } : imageSource;
    const imageUrl = resolveMetadataUrl(imageData.url, metadataBase);

    if (imageUrl) {
      tags.push(
        React.createElement("meta", {
          key: "twitter:image",
          name: "twitter:image",
          content: imageUrl,
        })
      );

      if ("alt" in imageData && imageData.alt) {
        tags.push(
          React.createElement("meta", {
            key: "twitter:image:alt",
            name: "twitter:image:alt",
            content: imageData.alt,
          })
        );
      }
    }
  }

  // twitter:site
  if (twitter?.site) {
    tags.push(
      React.createElement("meta", {
        key: "twitter:site",
        name: "twitter:site",
        content: twitter.site,
      })
    );
  }

  // twitter:creator
  if (twitter?.creator) {
    tags.push(
      React.createElement("meta", {
        key: "twitter:creator",
        name: "twitter:creator",
        content: twitter.creator,
      })
    );
  }

  return tags;
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

  // Generate Open Graph and Twitter Card meta tags
  const ogTags = renderOpenGraphTags(
    metadata.openGraph,
    metadata.title ?? "",
    metadata.description ?? "",
    metadata.metadataBase,
    pathname
  );
  const twitterTags = renderTwitterTags(
    metadata.twitter,
    metadata.openGraph,
    metadata.title ?? "",
    metadata.description ?? "",
    metadata.metadataBase
  );

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
      // Open Graph meta tags
      ...ogTags,
      // Twitter Card meta tags
      ...twitterTags,
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

  return await renderToReadableStream(fullDocument, {
    identifierPrefix: '',
  });
}
