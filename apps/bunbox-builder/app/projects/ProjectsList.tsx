"use client";

import { useState } from "react";
import type { Project } from "@/lib/db/schema";

interface ProjectsListProps {
  initialProjects: Project[];
}

export function ProjectsList({ initialProjects }: ProjectsListProps) {
  const [projects, setProjects] = useState(initialProjects);

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="messages-empty">
        <h2>No projects yet</h2>
        <p>
          Start a conversation to create your first bunbox app. Your projects
          will appear here.
        </p>
        <div className="suggestions">
          <a href="/" className="suggestion-chip">
            Start Building
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-grid">
      {projects.map((project) => (
        <div key={project.id} className="project-card">
          <h3>{project.name}</h3>
          <p>{project.description || "No description"}</p>
          <div className="meta">
            <span>Path: {project.path}</span>
            <span> · </span>
            <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
          </div>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <a
              href={`/project/${project.id}`}
              style={{
                padding: "6px 12px",
                background: "var(--accent)",
                color: "white",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "13px"
              }}
            >
              View
            </a>
            <button
              onClick={() => deleteProject(project.id)}
              style={{
                padding: "6px 12px",
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px"
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
