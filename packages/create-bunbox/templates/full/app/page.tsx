export default function Home() {
  return (
    <div className="landing">
      <h1>Welcome to Bunbox</h1>
      <p className="description">
        A modern, fast, and simple full-stack web framework built on Bun.
      </p>

      <div
        className="links"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
        }}
      >
        <a href="/about">About</a>
        <a href="/stream-demo">Streaming Demo</a>
        <a href="/chat">WebSockets</a>
        <a href="/api/health">Health API</a>
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
        <p>Edit <code>app/page.tsx</code> to get started</p>
      </div>
    </div>
  );
}
