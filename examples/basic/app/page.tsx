import type { PageProps, LoaderContext } from "@ademattos/bunbox";

export async function loader({ context }: LoaderContext) {
  // User data is passed from middleware
  return {
    user: context.user,
  };
}

export default function Home({ data }: PageProps) {
  const user = data?.user as { name: string; email: string } | undefined;

  const handleLogout = () => {
    // Clear auth cookie
    document.cookie = "auth_token=; path=/; max-age=0";
    window.location.href = "/auth/login";
  };

  return (
    <div className="landing">
      <h1>📦 Bunbox</h1>
      <p className="description">
        A modern, fast, and simple full-stack web framework built on Bun.
      </p>

      {user && (
        <div
          style={{
            background: "#e8f5e9",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            border: "2px solid #4CAF50",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#2e7d32" }}>
            🔒 Protected Route
          </h3>
          <p style={{ margin: "0 0 0.5rem 0" }}>
            Welcome, <strong>{user.name}</strong>!
          </p>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
            Email: {user.email}
          </p>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Logout
          </button>
        </div>
      )}

      <div
        className="links"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
        }}
      >
        <a href="/about">About</a>
        <a href="/users">useQuery Demo</a>
        <a href="/stream-demo">Streaming Demo</a>
        <a href="/chat">WebSockets</a>
        <a href="/ssr-example?name=John">Data Loader</a>
        <a
          href="https://github.com/demattosanthony/bunbox"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>

      <div className="details">
        <p>Built with React, TypeScript, and Bun</p>
        <p>Fast • Simple • Modern</p>
      </div>
    </div>
  );
}
