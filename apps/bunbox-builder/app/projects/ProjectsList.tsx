"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Trash2, ExternalLink, Sparkles, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string;
  created_at: string;
  updated_at: string;
}

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
        setLoading(false);
      });
  }, []);

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <FolderOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Start a conversation to create your first bunbox app.
        </p>
        <Button asChild>
          <a href="/" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Start Building
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <Card key={project.id} className="group hover:border-foreground/20 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{project.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {project.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
                  {project.path}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                  <a href={`/project/${project.id}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProject(project.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
