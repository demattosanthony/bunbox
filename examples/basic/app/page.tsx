export default function Home() {
  return (
    <div className="landing">
      <h1>📦 Bunbox</h1>
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
        <a href="/users">useQuery</a>
        <a href="/stream-demo">Streaming</a>
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
