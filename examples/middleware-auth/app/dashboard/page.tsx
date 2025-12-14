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
    <div className="container">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        Your personal dashboard. Protected by authentication middleware.
      </p>

      <div className="card">
        <div className="card-title">Account Details</div>
        <div className="card-info">
          <div className="info-row">
            <span className="info-label">User ID</span>
            <span className="info-value">{user.id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className="info-value">{user.role}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Access</span>
            <span className="info-value">
              {user.role === "admin" ? "Full Access" : "Standard Access"}
            </span>
          </div>
        </div>
      </div>

      <div className="btn-group">
        <a href="/" className="btn btn-secondary">
          ← Home
        </a>
        {user.role === "admin" && (
          <a href="/admin" className="btn btn-primary">
            Admin Panel →
          </a>
        )}
      </div>

      <div className="note">
        The root <span className="code">middleware.ts</span> validates your auth cookie,
        extracts user data, and passes it to the page loader through context.
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
