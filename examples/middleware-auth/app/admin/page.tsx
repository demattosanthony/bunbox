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
    <div className="container">
      <h1 className="page-title">Admin Panel</h1>
      <p className="page-subtitle">
        Role-based access control. Only admins can view this page.
      </p>

      <div className="card">
        <div className="card-title">
          Admin Access Granted
          <span className="badge badge-warning" style={{ marginLeft: "0.75rem" }}>
            Admin
          </span>
        </div>
        <div className="card-info">
          <div className="info-row">
            <span className="info-label">Admin ID</span>
            <span className="info-value">{user.id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className="info-value">{user.role}</span>
          </div>
        </div>
      </div>

      <div className="note">
        This page is protected by cascading middleware. First, <span className="code">app/middleware.ts</span> verifies
        authentication. Then, <span className="code">app/admin/middleware.ts</span> checks for admin role.
        Regular users are redirected to the dashboard.
      </div>

      <div className="btn-group">
        <a href="/" className="btn btn-secondary">
          ← Home
        </a>
        <a href="/dashboard" className="btn btn-primary">
          Dashboard
        </a>
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
