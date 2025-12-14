/**
 * Login page - public access (allowed by /auth middleware)
 */

export default function LoginPage() {
  const handleLogin = (role: "user" | "admin") => {
    // In a real app, you would validate credentials against a database
    // For demo, we'll create a simple token
    const userId = Math.random().toString(36).substring(7);
    const token = `user:${userId}:${role}`;

    // Set auth cookie
    document.cookie = `auth_token=${token}; path=/; max-age=3600`;

    // Redirect to home page
    window.location.href = "/";
  };

  return (
    <div className="container">
      <h1 className="page-title">Sign In</h1>
      <p className="page-subtitle">
        Choose a role to continue. No credentials required for this demo.
      </p>

      <div className="btn-group-grid">
        <button onClick={() => handleLogin("user")} className="btn btn-primary">
          Continue as User
        </button>
        <button onClick={() => handleLogin("admin")} className="btn btn-secondary">
          Continue as Admin
        </button>
      </div>

      <div className="note">
        This is a public page accessible without authentication. The <span className="code">auth/middleware.ts</span> file
        overrides the root middleware to allow public access to all <span className="code">/auth</span> routes.
      </div>

      <div className="divider" />

      <div style={{ fontSize: "0.9375rem", color: "var(--color-text-secondary)" }}>
        <div style={{ fontWeight: 500, marginBottom: "0.75rem", color: "var(--color-text)" }}>Try this</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div>• Login as <strong>User</strong> → can access home and dashboard</div>
          <div>• Login as <strong>Admin</strong> → can access all pages including admin panel</div>
          <div>• Visit protected routes → automatically redirects here</div>
        </div>
      </div>
    </div>
  );
}
