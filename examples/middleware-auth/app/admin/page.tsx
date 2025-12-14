/**
 * Admin page - protected by admin middleware
 * Only accessible to users with admin role
 */

import type { PageProps, LoaderContext } from "@ademattos/bunbox";

export async function loader({ context }: LoaderContext) {
  return {
    user: context.user as { id: string; role: string },
  };
}

export default function AdminPage({ data }: PageProps) {
  const user = (data as { user: { id: string; role: string } })?.user;

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>⚙️ Admin Panel</h1>
      <p style={{ color: "#666" }}>
        This page requires admin role. Protected by cascading middleware!
      </p>

      <div
        style={{
          background: "#fff3e0",
          padding: "1.5rem",
          borderRadius: "8px",
          marginTop: "2rem",
          border: "2px solid #FF9800",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#E65100" }}>
          🔐 Admin Access Granted
        </h2>
        <p style={{ margin: "0.5rem 0" }}>
          <strong>Admin ID:</strong> {user.id}
        </p>
        <p style={{ margin: "0.5rem 0" }}>
          <strong>Role:</strong> {user.role}
        </p>
        <p style={{ margin: "1rem 0 0 0", fontSize: "0.9rem", color: "#666" }}>
          Only users with the <code>admin</code> role can access this page.
        </p>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>Middleware Cascade:</h3>
        <ol style={{ fontSize: "0.9rem", lineHeight: "1.8" }}>
          <li>
            <code>app/middleware.ts</code> verified authentication
            <div style={{ paddingLeft: "1rem", color: "#666" }}>
              → Added user to context
            </div>
          </li>
          <li>
            <code>app/admin/middleware.ts</code> checked admin role
            <div style={{ paddingLeft: "1rem", color: "#666" }}>
              → Would redirect if role !== "admin"
              <br />→ Passed user through to page
            </div>
          </li>
          <li>
            Page loader received validated admin user
            <div style={{ paddingLeft: "1rem", color: "#666" }}>
              → Passed to page component
            </div>
          </li>
        </ol>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#e8f5e9",
          borderRadius: "4px",
          border: "1px solid #4CAF50",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          💡 <strong>Tip:</strong> Try logging in as a regular user and
          accessing this page. The admin middleware will redirect you to the
          dashboard!
        </p>
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
        <a
          href="/dashboard"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#2196F3",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Dashboard
        </a>
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
