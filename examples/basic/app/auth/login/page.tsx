/**
 * Login page - public access (protected by /auth middleware)
 */

import { useClientEffect } from "@ademattos/bunbox";

export default function LoginPage() {
  const handleLogin = () => {
    // In a real app, you would validate credentials
    // For demo, just set a cookie and redirect
    document.cookie = "auth_token=demo_token; path=/; max-age=3600";
    window.location.href = "/";
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Login</h1>
      <p>
        This is a public page. Click the button below to "log in" and access
        protected routes.
      </p>

      <button
        onClick={handleLogin}
        style={{
          padding: "0.75rem 1.5rem",
          background: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "1rem",
          marginTop: "1rem",
        }}
      >
        Login
      </button>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f0f0f0",
          borderRadius: "4px",
        }}
      >
        <h3>How this works:</h3>
        <ul style={{ fontSize: "0.9rem" }}>
          <li>
            <code>/app/middleware.ts</code> protects ALL routes by default
          </li>
          <li>
            <code>/app/auth/middleware.ts</code> overrides it for /auth routes
          </li>
          <li>If not authenticated, you're redirected to /auth/login</li>
          <li>After login, the auth cookie lets you access protected routes</li>
        </ul>
      </div>
    </div>
  );
}
