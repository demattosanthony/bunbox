export default function Home() {
  return (
    <div className="landing">
      <h1>Welcome to Bunbox</h1>
      <p className="description">
        A modern, fast, and simple full-stack web framework built on Bun.
      </p>

      <div className="links">
        <a href="/api/health">Health Check API</a>
        <a
          href="https://github.com/demattosanthony/bunbox"
          target="_blank"
          rel="noopener noreferrer"
        >
          Documentation
        </a>
      </div>

      <div className="details">
        <p>Built with React, TypeScript, and Bun</p>
        <p>
          Edit <code>app/page.tsx</code> to get started
        </p>
      </div>
    </div>
  );
}
