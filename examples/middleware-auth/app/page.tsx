/**
 * Home page - protected by root middleware
 * Redirects to /auth/login if not authenticated
 */

import type { PageProps, LoaderContext } from "@ademattos/bunbox";

export async function loader({ context }: LoaderContext) {
  // User data is passed from middleware
  return {
    user: context.user as { id: string; role: string },
  };
}

export default function HomePage({ data }: PageProps) {
  const user = (data as { user: { id: string; role: string } })?.user;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>🔒 Middleware Authentication Example</h1>
      <p style={{ color: "#666" }}>
        This example demonstrates how to use middleware for authentication and
        authorization.
      </p>

      <div
        style={{
          background: "#e8f5e9",
          padding: "1.5rem",
          borderRadius: "8px",
          marginTop: "2rem",
          border: "2px solid #4CAF50",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#2e7d32" }}>
          ✅ You're Authenticated!
        </h2>
        <p style={{ margin: "0.5rem 0" }}>
          <strong>User ID:</strong> {user.id}
        </p>
        <p style={{ margin: "0.5rem 0" }}>
          <strong>Role:</strong> {user.role}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <a
          href="/dashboard"
          style={{
            padding: "1rem",
            background: "#2196F3",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          Go to Dashboard
        </a>
        <a
          href="/admin"
          style={{
            padding: "1rem",
            background: "#FF9800",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          Admin Panel {user.role !== "admin" && "(requires admin)"}
        </a>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>How it works:</h3>
        <ul style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
          <li>
            <code>app/middleware.ts</code> protects all routes
          </li>
          <li>
            <code>app/auth/middleware.ts</code> allows public access to /auth
          </li>
          <li>
            <code>app/admin/middleware.ts</code> checks for admin role
          </li>
          <li>Middleware context flows to loaders and pages</li>
        </ul>
      </div>

      <button
        onClick={() => {
          document.cookie = "auth_token=; path=/; max-age=0";
          window.location.href = "/auth/login";
        }}
        style={{
          marginTop: "2rem",
          padding: "0.75rem 1.5rem",
          background: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        Logout
      </button>
    </div>
  );
}
