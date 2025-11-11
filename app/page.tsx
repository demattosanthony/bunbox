import React from "react";

export default function Home() {
  return (
    <div className="landing">
      <h1>BunBox</h1>
      
      <p className="description">
        A modern, fast, and simple framework built on Bun.
      </p>
      
      <div className="links">
        <a href="/about">About</a>
        <a href="/blog/hello-world">Blog</a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
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
