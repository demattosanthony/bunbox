"use server";

import type { PageMetadata, PageProps } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "SSR Example",
  description: "Server-side rendering with Bunbox",
};

export default function SSRExample({ params, query }: PageProps) {
  const serverTime = new Date().toISOString();

  console.log("\n[SSR] Rendered at:", serverTime);
  console.log("[SSR] Query:", query);

  return (
    <div className="card">
      <h1>Server-Side Rendering</h1>

      <p style={{ color: "#666", fontSize: "1.125rem", marginTop: "1rem" }}>
        This page rendered on the server.
      </p>

      <div
        style={{
          marginTop: "3rem",
          padding: "2rem",
          background: "#fafafa",
          borderRadius: "8px",
          fontSize: "0.9375rem",
          lineHeight: "1.8",
        }}
      >
        <p style={{ margin: 0, color: "#333" }}>
          Add <code>"use server"</code> to the top of your page.
          <br />
          That's it.
        </p>
      </div>

      <div
        style={{
          marginTop: "3rem",
          padding: "1.5rem",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
        }}
      >
        <div
          style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.5rem" }}
        >
          RENDERED AT
        </div>
        <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
          {serverTime}
        </div>
      </div>

      {Object.keys(query).length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1.5rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            QUERY PARAMS
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
            {JSON.stringify(query)}
          </div>
        </div>
      )}

      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <a href="/" className="back-link">
          Back
        </a>
      </div>
    </div>
  );
}
