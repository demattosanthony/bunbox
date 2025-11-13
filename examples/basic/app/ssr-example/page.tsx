"use server";
/**
 * Server-side rendered page example
 * The "use server" directive tells Bunbox to render this page on the server
 */

import type { PageMetadata, PageProps } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "SSR Example",
  description:
    "This page uses 'use server' to render on the server. The HTML is generated before it reaches your browser.",
};

export default function SSRExample({ params, query }: PageProps) {
  // This code runs on the server before sending HTML to the browser
  const serverTime = new Date().toISOString();
  const hasQuery = Object.keys(query).length > 0;

  // Log to terminal when this page renders on the server
  console.log("\n[SSR Page Rendered]");
  console.log("Time:", serverTime);
  console.log("Params:", params);
  console.log("Query:", query);
  console.log("───────────────────────────\n");

  return (
    <div className="card">
      <h1>Server-Side Rendered Page</h1>
      <p style={{ color: "#666", marginTop: "1rem" }}>
        This page uses <code>"use server"</code> to render on the server. The
        HTML is generated before it reaches your browser.
      </p>

      <h2
        style={{
          marginTop: "2rem",
          marginBottom: "1rem",
          fontSize: "1.125rem",
        }}
      >
        How It Works
      </h2>
      <ul style={{ marginLeft: "1.5rem", color: "#666", fontSize: "0.875rem" }}>
        <li>
          Add <code>"use server"</code> at the top of your page
        </li>
        <li>Your component runs on the server</li>
        <li>HTML is generated and sent to the browser</li>
        <li>Check your terminal to see server logs</li>
      </ul>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
        }}
      >
        <strong>Server Info</strong>
        <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#666" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Rendered:</strong> <code>{serverTime}</code>
          </div>
          {hasQuery && (
            <div>
              <strong>Query:</strong> <code>{JSON.stringify(query)}</code>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <a href="/" className="back-link">
          Back to Home
        </a>
      </div>
    </div>
  );
}
