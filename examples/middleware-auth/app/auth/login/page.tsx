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
    <div style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1>🔓 Login</h1>
      <p style={{ color: "#666" }}>
        This is a public page accessible without authentication.
      </p>

      <div
        style={{
          background: "#fff3cd",
          padding: "1rem",
          borderRadius: "4px",
          marginTop: "2rem",
          border: "1px solid #ffc107",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          ℹ️ <strong>Demo Login:</strong> Choose a role to login. No password
          required!
        </p>
      </div>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        <button
          onClick={() => handleLogin("user")}
          style={{
            flex: 1,
            padding: "1rem",
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          Login as User
        </button>
        <button
          onClick={() => handleLogin("admin")}
          style={{
            flex: 1,
            padding: "1rem",
            background: "#FF9800",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          Login as Admin
        </button>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>What happens when you login:</h3>
        <ol style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
          <li>A demo auth token is created with your role</li>
          <li>Token is stored in a cookie</li>
          <li>You're redirected to the home page</li>
          <li>Root middleware validates your token</li>
          <li>User data is available in all protected pages</li>
        </ol>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#e3f2fd",
          borderRadius: "4px",
          border: "1px solid #2196F3",
        }}
      >
        <h4 style={{ margin: "0 0 0.5rem 0" }}>Try this:</h4>
        <ul style={{ fontSize: "0.9rem", lineHeight: "1.6", margin: 0 }}>
          <li>Login as <strong>User</strong> and try accessing <code>/admin</code> (redirects to dashboard)</li>
          <li>Login as <strong>Admin</strong> and access <code>/admin</code> (granted access)</li>
          <li>Logout and try accessing <code>/</code> (redirects to login)</li>
        </ul>
      </div>
    </div>
  );
}
