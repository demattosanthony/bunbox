/**
 * SSR Module Tests
 * Tests for server-side rendering including Open Graph and Twitter Card meta tags
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderPage } from "../../src/core/ssr";
import type { PageModule, LayoutModule, PageMetadata } from "../../src/core/types";

// Helper to create a simple page module
function createPageModule(metadata?: PageMetadata): PageModule {
  return {
    default: () => React.createElement("div", null, "Test Page"),
    metadata,
  };
}

// Helper to create a simple layout module
function createLayoutModule(metadata?: PageMetadata): LayoutModule {
  return {
    default: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    metadata,
  };
}

// Helper to consume a ReadableStream and return HTML string
async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

describe("renderPage", () => {
  describe("basic rendering", () => {
    test("renders a basic page without metadata", async () => {
      const pageModule = createPageModule();
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain("<title>Bunbox App</title>");
      expect(html).toContain('<div id="root">');
      expect(html).toContain("Test Page");
    });

    test("renders page title from metadata", async () => {
      const pageModule = createPageModule({ title: "My Page Title" });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain("<title>My Page Title</title>");
    });

    test("renders description meta tag", async () => {
      const pageModule = createPageModule({ description: "Page description here" });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="description" content="Page description here"/>');
    });
  });

  describe("Open Graph meta tags", () => {
    test("renders og:title falling back to page title", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:title" content="Page Title"/>');
    });

    test("renders og:title from openGraph when specified", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
        metadataBase: "https://example.com",
        openGraph: {
          title: "OG Specific Title",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:title" content="OG Specific Title"/>');
    });

    test("renders og:description falling back to page description", async () => {
      const pageModule = createPageModule({
        description: "Page description",
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:description" content="Page description"/>');
    });

    test("renders og:url from metadataBase + pathname", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/blog/post");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:url" content="https://example.com/blog/post"/>');
    });

    test("renders og:type defaulting to website", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:type" content="website"/>');
    });

    test("renders og:type as article when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          type: "article",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:type" content="article"/>');
    });

    test("renders og:image with string URL", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          image: "/og-image.png",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:image" content="https://example.com/og-image.png"/>');
    });

    test("renders og:image with object including dimensions", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          image: {
            url: "/og-image.png",
            width: 1200,
            height: 630,
            alt: "Preview image",
          },
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:image" content="https://example.com/og-image.png"/>');
      expect(html).toContain('<meta property="og:image:width" content="1200"/>');
      expect(html).toContain('<meta property="og:image:height" content="630"/>');
      expect(html).toContain('<meta property="og:image:alt" content="Preview image"/>');
    });

    test("renders og:site_name when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          siteName: "My Website",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:site_name" content="My Website"/>');
    });

    test("renders og:locale when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          locale: "en_US",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:locale" content="en_US"/>');
    });

    test("handles absolute image URLs without metadataBase", async () => {
      const pageModule = createPageModule({
        openGraph: {
          image: "https://cdn.example.com/og-image.png",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:image" content="https://cdn.example.com/og-image.png"/>');
    });
  });

  describe("Twitter Card meta tags", () => {
    test("renders twitter:card defaulting to summary_large_image", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    });

    test("renders twitter:card as summary when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        twitter: {
          card: "summary",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:card" content="summary"/>');
    });

    test("renders twitter:title falling back to og:title then page title", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:title" content="Page Title"/>');
    });

    test("renders twitter:title from twitter when specified", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
        metadataBase: "https://example.com",
        twitter: {
          title: "Twitter Specific Title",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:title" content="Twitter Specific Title"/>');
    });

    test("renders twitter:description falling back to og:description then page description", async () => {
      const pageModule = createPageModule({
        description: "Page description",
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:description" content="Page description"/>');
    });

    test("renders twitter:image falling back to og:image", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          image: "/og-image.png",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:image" content="https://example.com/og-image.png"/>');
    });

    test("renders twitter:image from twitter when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        openGraph: {
          image: "/og-image.png",
        },
        twitter: {
          image: "/twitter-image.png",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:image" content="https://example.com/twitter-image.png"/>');
    });

    test("renders twitter:site when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        twitter: {
          site: "@mysite",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:site" content="@mysite"/>');
    });

    test("renders twitter:creator when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        twitter: {
          creator: "@author",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:creator" content="@author"/>');
    });

    test("renders twitter:image:alt when specified", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://example.com",
        twitter: {
          image: {
            url: "/twitter-image.png",
            alt: "Twitter preview image",
          },
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:image" content="https://example.com/twitter-image.png"/>');
      expect(html).toContain('<meta name="twitter:image:alt" content="Twitter preview image"/>');
    });
  });

  describe("metadata inheritance from layouts", () => {
    test("inherits metadataBase from layout", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
      });
      const layoutModule = createLayoutModule({
        metadataBase: "https://example.com",
      });
      const stream = await renderPage(pageModule, [layoutModule], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:url" content="https://example.com/"/>');
    });

    test("page metadataBase overrides layout metadataBase", async () => {
      const pageModule = createPageModule({
        metadataBase: "https://page.example.com",
      });
      const layoutModule = createLayoutModule({
        metadataBase: "https://layout.example.com",
      });
      const stream = await renderPage(pageModule, [layoutModule], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:url" content="https://page.example.com/"/>');
    });

    test("inherits openGraph from layout", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
      });
      const layoutModule = createLayoutModule({
        metadataBase: "https://example.com",
        openGraph: {
          siteName: "My Site",
          locale: "en_US",
          image: "/default-og.png",
        },
      });
      const stream = await renderPage(pageModule, [layoutModule], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta property="og:site_name" content="My Site"/>');
      expect(html).toContain('<meta property="og:locale" content="en_US"/>');
      expect(html).toContain('<meta property="og:image" content="https://example.com/default-og.png"/>');
    });

    test("page openGraph overrides layout openGraph", async () => {
      const pageModule = createPageModule({
        openGraph: {
          image: "/page-og.png",
          type: "article",
        },
      });
      const layoutModule = createLayoutModule({
        metadataBase: "https://example.com",
        openGraph: {
          siteName: "My Site",
          image: "/default-og.png",
          type: "website",
        },
      });
      const stream = await renderPage(pageModule, [layoutModule], {}, {}, false, "/");
      const html = await streamToString(stream);

      // Page overrides
      expect(html).toContain('<meta property="og:image" content="https://example.com/page-og.png"/>');
      expect(html).toContain('<meta property="og:type" content="article"/>');
      // Layout inherited
      expect(html).toContain('<meta property="og:site_name" content="My Site"/>');
    });

    test("inherits twitter from layout", async () => {
      const pageModule = createPageModule({
        title: "Page Title",
      });
      const layoutModule = createLayoutModule({
        metadataBase: "https://example.com",
        twitter: {
          site: "@mysite",
          card: "summary_large_image",
        },
      });
      const stream = await renderPage(pageModule, [layoutModule], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:site" content="@mysite"/>');
    });

    test("page twitter overrides layout twitter", async () => {
      const pageModule = createPageModule({
        twitter: {
          creator: "@pageauthor",
        },
      });
      const layoutModule = createLayoutModule({
        metadataBase: "https://example.com",
        twitter: {
          site: "@mysite",
          creator: "@layoutauthor",
        },
      });
      const stream = await renderPage(pageModule, [layoutModule], {}, {}, false, "/");
      const html = await streamToString(stream);

      expect(html).toContain('<meta name="twitter:creator" content="@pageauthor"/>');
      expect(html).toContain('<meta name="twitter:site" content="@mysite"/>');
    });
  });

  describe("complete example", () => {
    test("renders full Open Graph and Twitter metadata", async () => {
      const pageModule = createPageModule({
        title: "My Blog Post",
        description: "An interesting blog post about testing",
        metadataBase: "https://example.com",
        openGraph: {
          type: "article",
          siteName: "My Blog",
          locale: "en_US",
          image: {
            url: "/blog/post-og.png",
            width: 1200,
            height: 630,
            alt: "Blog post preview",
          },
        },
        twitter: {
          card: "summary_large_image",
          site: "@myblog",
          creator: "@author",
        },
      });
      const stream = await renderPage(pageModule, [], {}, {}, false, "/blog/my-post");
      const html = await streamToString(stream);

      // Basic meta tags
      expect(html).toContain("<title>My Blog Post</title>");
      expect(html).toContain('<meta name="description" content="An interesting blog post about testing"/>');

      // Open Graph tags
      expect(html).toContain('<meta property="og:title" content="My Blog Post"/>');
      expect(html).toContain('<meta property="og:description" content="An interesting blog post about testing"/>');
      expect(html).toContain('<meta property="og:url" content="https://example.com/blog/my-post"/>');
      expect(html).toContain('<meta property="og:type" content="article"/>');
      expect(html).toContain('<meta property="og:site_name" content="My Blog"/>');
      expect(html).toContain('<meta property="og:locale" content="en_US"/>');
      expect(html).toContain('<meta property="og:image" content="https://example.com/blog/post-og.png"/>');
      expect(html).toContain('<meta property="og:image:width" content="1200"/>');
      expect(html).toContain('<meta property="og:image:height" content="630"/>');
      expect(html).toContain('<meta property="og:image:alt" content="Blog post preview"/>');

      // Twitter Card tags
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
      expect(html).toContain('<meta name="twitter:title" content="My Blog Post"/>');
      expect(html).toContain('<meta name="twitter:description" content="An interesting blog post about testing"/>');
      expect(html).toContain('<meta name="twitter:image" content="https://example.com/blog/post-og.png"/>');
      expect(html).toContain('<meta name="twitter:site" content="@myblog"/>');
      expect(html).toContain('<meta name="twitter:creator" content="@author"/>');
    });
  });
});
