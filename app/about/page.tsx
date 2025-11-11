/**
 * About page - Client-side rendered by default
 */

import React from "react";

export default function About() {
  return (
    <div className="card">
      <h1>About Bunbox</h1>
      <p style={{ marginTop: "1rem" }}>
        Bunbox is a full-stack web framework designed to be 100x simpler than
        Next.js, built entirely on top of Bun's native capabilities.
      </p>

      <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Why Bunbox?</h2>
      <ul style={{ marginLeft: "1.5rem" }}>
        <li>
          <strong>Simplicity First:</strong> No complex configuration or build
          steps
        </li>
        <li>
          <strong>Bun Native:</strong> Leverages Bun's built-in features for
          maximum performance
        </li>
        <li>
          <strong>Familiar API:</strong> Next.js-style routing that developers
          already know
        </li>
        <li>
          <strong>Full Stack:</strong> SSR, API routes, and WebSockets in one
          package
        </li>
      </ul>

      <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Tech Stack</h2>
      <ul style={{ marginLeft: "1.5rem" }}>
        <li>Bun.serve() for HTTP server</li>
        <li>React 18 with SSR support</li>
        <li>File-based routing system</li>
        <li>Native WebSocket support</li>
        <li>TypeScript by default</li>
      </ul>
    </div>
  );
}
