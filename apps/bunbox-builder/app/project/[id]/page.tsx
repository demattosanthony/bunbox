import { getProject } from "@/lib/db";
import type { Project } from "@/lib/db/schema";

export async function loader({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) {
    throw new Error("Project not found");
  }

  // List project files
  let files: string[] = [];
  try {
    const glob = new Bun.Glob("**/*");
    for await (const file of glob.scan({ cwd: project.path, onlyFiles: true })) {
      files.push(file);
    }
  } catch {
    // Project directory might not exist
  }

  return { project, files };
}

export default function ProjectPage({
  data
}: {
  data: { project: Project; files: string[] };
}) {
  const { project, files } = data;

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>
          <span className="logo"></span>
          Bunbox Builder
        </h1>
        <nav className="nav-links">
          <a href="/">New Chat</a>
          <a href="/projects">Projects</a>
        </nav>
      </header>

      <div className="projects-container">
        <div className="projects-header">
          <h1>{project.name}</h1>
        </div>

        <div className="project-card" style={{ marginBottom: "24px" }}>
          <p>{project.description || "No description"}</p>
          <div className="meta" style={{ marginTop: "12px" }}>
            <div>Path: <code>{project.path}</code></div>
            <div>Created: {new Date(project.created_at).toLocaleString()}</div>
            <div>Updated: {new Date(project.updated_at).toLocaleString()}</div>
          </div>
        </div>

        <h2 style={{ marginBottom: "16px", fontSize: "18px" }}>Project Files</h2>

        {files.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No files yet</p>
        ) : (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "16px"
            }}
          >
            {files.map((file) => (
              <div
                key={file}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-color)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px"
                }}
              >
                {file}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>
            Run the project
          </h3>
          <pre
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              overflow: "auto"
            }}
          >
            cd {project.path}
            {"\n"}bun install
            {"\n"}bun run dev
          </pre>
        </div>
      </div>
    </div>
  );
}
