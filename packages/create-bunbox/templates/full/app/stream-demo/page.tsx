/**
 * Example page demonstrating useStream hook
 */

import { api } from "../../.bunbox/api-client";

export default function StreamPage() {
  const { data, loading, error, start, abort } =
    api.stream.streamTokens.useStream({
      enabled: false, // Wait for button click
      onMessage: (msg: { token: string }) => console.log("Received:", msg),
      onFinish: () => console.log("Stream finished"),
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
        <h1>Streaming Demo</h1>
        <a href="/" style={{ fontSize: "0.875rem" }}>
          ← Home
        </a>
      </div>

      <p style={{ marginTop: "1rem", color: "#666" }}>
        This page demonstrates the <code>useStream</code> hook with Server-Sent
        Events (SSE).
      </p>

      <div style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <button
            onClick={start}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              background: loading ? "#d1d5db" : "#000",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {loading ? "Streaming..." : "Start Stream"}
          </button>

          {loading && (
            <button
              onClick={abort}
              style={{
                padding: "0.5rem 1rem",
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Abort
            </button>
          )}
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
            <strong>Status:</strong> {loading ? "Streaming" : "Idle"}
          </div>
          <div>
            <strong>Chunks:</strong> {data.length}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "6px",
              color: "#c00",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            <strong>Error:</strong> {error.message}
          </div>
        )}

        <div
          style={{
            padding: "1.5rem",
            background: "#f3f4f6",
            borderRadius: "8px",
            minHeight: "100px",
            fontFamily: "monospace",
            fontSize: "1.125rem",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
          }}
        >
          {data.map((msg: { token: string }, i: number) => (
            <span key={i} style={{ animation: "fadeIn 0.3s ease-in" }}>
              {msg.token}
            </span>
          ))}
          {loading && <span className="cursor-blink">|</span>}
          {!loading && data.length === 0 && (
            <span style={{ color: "#9ca3af" }}>
              Click "Start Stream" to receive messages...
            </span>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .cursor-blink {
            animation: blink 1s step-end infinite;
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
