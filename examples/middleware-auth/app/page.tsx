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
    <div className="container">
      <h1 className="page-title">Middleware Authentication</h1>
      <p className="page-subtitle">
        A simple, elegant example of route protection with cascading middleware.
      </p>

      <div className="card">
        <div className="card-info">
          <div className="info-row">
            <span className="info-label">User ID</span>
            <span className="info-value">{user.id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className="info-value">
              {user.role}
              {user.role === "admin" && (
                <span className="badge badge-warning" style={{ marginLeft: "0.5rem" }}>
                  Admin
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="btn-group-grid">
        <a href="/dashboard" className="btn btn-primary">
          Dashboard
        </a>
        <a href="/admin" className="btn btn-secondary">
          Admin Panel
        </a>
      </div>

      <div className="note">
        Routes are protected by <span className="code">middleware.ts</span> files.
        Public routes like <span className="code">/auth/login</span> override parent middleware.
        Admin routes check role permissions.
      </div>

      <div className="divider" />

      <button
        onClick={() => {
          document.cookie = "auth_token=; path=/; max-age=0";
          window.location.href = "/auth/login";
        }}
        className="btn btn-danger"
      >
        Sign Out
      </button>
    </div>
  );
}
