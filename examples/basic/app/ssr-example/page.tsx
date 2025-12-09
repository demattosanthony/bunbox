import type { PageMetadata, PageProps, LoaderContext } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "Data Loading Example",
  description: "Server-side data loading with Bunbox",
};

interface LoaderData {
  serverTime: string;
  message: string;
}

export async function loader({ query }: LoaderContext): Promise<LoaderData> {
  // This runs on the server for both SSR and client-side navigation
  console.log("\n[Loader] Executed at:", new Date().toISOString());
  console.log("[Loader] Query:", query);

  return {
    serverTime: new Date().toISOString(),
    message: query.name ? `Hello, ${query.name}!` : "Hello!",
  };
}

export default function DataLoadingExample({ query, data }: PageProps) {
  const { serverTime, message } = data as LoaderData;

  return (
    <div className="card">
      <h1>Server Data Loading</h1>

      <p style={{ color: "#666", fontSize: "1.125rem", marginTop: "1rem" }}>
        This page uses a loader to fetch data on the server.
      </p>

      <div
        style={{
          marginTop: "3rem",
          padding: "2rem",
          background: "#fafafa",
          borderRadius: "8px",
          fontSize: "0.9375rem",
          lineHeight: "1.8",
        }}
      >
        <p style={{ margin: 0, color: "#333" }}>
          Export a <code>loader</code> function from your page.
          <br />
          The loader runs on the server and data flows to your component.
        </p>
      </div>

      <div
        style={{
          marginTop: "3rem",
          padding: "1.5rem",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
        }}
      >
        <div
          style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.5rem" }}
        >
          LOADER DATA
        </div>
        <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
          {message}
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "0.75rem",
            color: "#666",
            marginTop: "0.5rem",
          }}
        >
          Fetched at: {serverTime}
        </div>
      </div>

      {Object.keys(query).length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1.5rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            QUERY PARAMS
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
            {JSON.stringify(query)}
          </div>
        </div>
      )}

      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <a href="/" className="back-link">
          Back
        </a>
      </div>
    </div>
  );
}
