"use server";
/**
 * Server-side rendered page example
 * This page uses SSR because of the "use server" directive
 */

import type { SSRContext } from "../../src/index";

export default function SSRExample({ params, query, url }: SSRContext) {
  // This code runs on the server
  const serverTime = new Date().toISOString();

  return (
    <div className="card">
      <h1>Server-Side Rendered Page</h1>
      <p style={{ marginTop: "1rem" }}>
        This page was rendered on the server because it starts with{" "}
        <code>"use server"</code>.
      </p>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: "4px",
        }}
      >
        <strong>Server Info:</strong>
        <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem" }}>
          <li>
            Rendered at: <code>{serverTime}</code>
          </li>
          <li>
            URL: <code>{url}</code>
          </li>
          <li>
            Query params: <code>{JSON.stringify(query)}</code>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <a href="/" style={{ color: "#0066cc" }}>
          ← Back to Home (Client-side)
        </a>
      </div>
    </div>
  );
}
