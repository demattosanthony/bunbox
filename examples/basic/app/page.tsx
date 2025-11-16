export default function Home() {
  return (
    <div className="landing">
      <h1>📦 Bunbox</h1>
      <p className="description">
        A modern, fast, and simple full-stack web framework built on Bun.
      </p>

      <div className="links">
        <a href="/about">About</a>
        <a href="/chat">WebSockets</a>
        <a href="/ssr-example?name=John">SSR Page</a>
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
