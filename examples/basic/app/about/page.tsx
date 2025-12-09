/**
 * About page - Client-side rendered by default
 */

import { useRouter } from "@ademattos/bunbox/client";

export default function About() {
  const { navigate } = useRouter();

  return (
    <div className="card">
      <h1>About Bunbox</h1>
      <p style={{ marginTop: "1rem" }}>
        A full-stack framework for Bun. Everything you need—REST APIs, web apps,
        and real-time sockets—powered by just Bun and React.
      </p>

      <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>How It Works</h2>
      <p style={{ marginBottom: "1rem", color: "#666" }}>
        Create files in your <code>app/</code> directory. Bunbox automatically
        turns them into routes:
      </p>
      <ul style={{ marginLeft: "1.5rem", color: "#666" }}>
        <li>
          <code>app/page.tsx</code> → <code>/</code> route
        </li>
        <li>
          <code>app/about/page.tsx</code> → <code>/about</code> route
        </li>
        <li>
          <code>app/api/users/route.ts</code> → <code>/api/users</code> endpoint
        </li>
        <li>
          <code>app/sockets/chat/route.ts</code> → <code>/sockets/chat</code>{" "}
          socket
        </li>
      </ul>

      <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>
        What It Provides
      </h2>
      <ul style={{ marginLeft: "1.5rem" }}>
        <li>
          <strong>REST API:</strong> Export <code>GET</code>, <code>POST</code>,
          etc. from route files
        </li>
        <li>
          <strong>Web App:</strong> React pages with SSR and server-side data
          loading via <code>loader</code>
        </li>
        <li>
          <strong>Socket Server:</strong> Type-safe real-time handlers with user
          management
        </li>
        <li>
          <strong>Socket Client:</strong> React hooks and vanilla JS clients
        </li>
      </ul>

      <div style={{ marginTop: "2rem" }}>
        <button
          style={{
            padding: "0.5rem 1rem",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
          onClick={() => navigate("/")}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
