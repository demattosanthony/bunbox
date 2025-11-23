/**
 * Example page demonstrating useQuery hook
 */

import { useState } from "react";
import { api } from "../../.bunbox/api-client";

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<"admin" | "user" | "">("");
  const [enabled, setEnabled] = useState(true);

  // Demonstrate useQuery with dynamic query parameters
  const { data, loading, error, refetch } = api.users.GET.useQuery({
    query: roleFilter ? { role: roleFilter } : {},
    enabled,
  });

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Users Example</h1>
        <a href="/" style={{ fontSize: "0.875rem" }}>
          ← Home
        </a>
      </div>

      <p style={{ marginTop: "1rem", color: "#666" }}>
        This page demonstrates the <code>useQuery</code> hook with the
        auto-generated API client.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
          Features Demo
        </h2>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <label style={{ marginRight: "0.5rem", fontSize: "0.875rem" }}>
              Filter by role:
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              style={{
                padding: "0.375rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="">All</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            style={{
              padding: "0.375rem 0.75rem",
              background: loading ? "#d1d5db" : "#000",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
            }}
          >
            {loading ? "Refetching..." : "Refetch"}
          </button>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Enabled
          </label>
        </div>

        {/* Status indicators */}
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            gap: "1rem",
            fontSize: "0.875rem",
            color: "#666",
          }}
        >
          <div>
            <strong>Loading:</strong> {loading ? "✓" : "✗"}
          </div>
          <div>
            <strong>Error:</strong> {error ? "✓" : "✗"}
          </div>
          <div>
            <strong>Data:</strong> {data ? "✓" : "✗"}
          </div>
        </div>

        {/* Content */}
        {!enabled && (
          <div
            style={{
              padding: "1rem",
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            Query is disabled. Check the "Enabled" box to fetch data.
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "1rem",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "6px",
              color: "#c00",
              fontSize: "0.875rem",
            }}
          >
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {loading && enabled && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#666",
            }}
          >
            Loading users...
          </div>
        )}

        {data && !loading && (
          <div>
            <div
              style={{
                marginBottom: "1rem",
                fontSize: "0.875rem",
                color: "#666",
              }}
            >
              Found <strong>{data.total}</strong> user(s)
              {roleFilter && ` with role "${roleFilter}"`}
              <br />
              <em>
                Last updated: {new Date(data.timestamp).toLocaleTimeString()}
              </em>
            </div>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              {data.users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#666" }}>
                      {user.email}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.25rem 0.75rem",
                      background: user.role === "admin" ? "#dbeafe" : "#f3f4f6",
                      color: user.role === "admin" ? "#1e40af" : "#374151",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {user.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code example */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}
        >
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
            Code Example
          </h3>
          <pre
            style={{
              fontSize: "0.75rem",
              overflow: "auto",
              margin: 0,
              fontFamily: "monospace",
            }}
          >
            {`const { data, loading, error, refetch } = api.users.GET.useQuery({
  query: { role: "admin" }, // optional query params
  enabled: true,             // conditional fetching
});`}
          </pre>
        </div>
      </div>
    </div>
  );
}
