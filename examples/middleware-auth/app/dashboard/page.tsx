/**
 * Dashboard page - protected by root middleware
 * Accessible to all authenticated users
 */

import type { PageProps, LoaderContext } from "@ademattos/bunbox";

export async function loader({ context }: LoaderContext) {
  return {
    user: context.user as { id: string; role: string },
  };
}

export default function DashboardPage({ data }: PageProps) {
  const user = (data as { user: { id: string; role: string } })?.user;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>📊 Dashboard</h1>
      <p style={{ color: "#666" }}>
        Welcome to your dashboard! This page is protected by authentication
        middleware.
      </p>

      <div
        style={{
          background: "#e3f2fd",
          padding: "1.5rem",
          borderRadius: "8px",
          marginTop: "2rem",
          border: "2px solid #2196F3",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#1976D2" }}>
          User Information
        </h2>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <p style={{ margin: 0 }}>
            <strong>ID:</strong> {user.id}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Role:</strong> {user.role}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Access Level:</strong>{" "}
            {user.role === "admin" ? "Full Access" : "Standard Access"}
          </p>
        </div>
      </div>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        <a
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#9E9E9E",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          ← Home
        </a>
        {user.role === "admin" && (
          <a
            href="/admin"
            style={{
              padding: "0.75rem 1.5rem",
              background: "#FF9800",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Admin Panel →
          </a>
        )}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>Middleware Flow:</h3>
        <ol style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
          <li>
            <code>app/middleware.ts</code> checked your auth cookie
          </li>
          <li>Validated your token and extracted user data</li>
          <li>Added user to context for this page's loader</li>
          <li>Loader received user data and passed it to the page</li>
        </ol>
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
