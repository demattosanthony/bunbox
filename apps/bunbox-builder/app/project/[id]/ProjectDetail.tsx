"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCode, Terminal, ArrowLeft, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string;
  created_at: string;
  updated_at: string;
}

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((res) => res.json()),
      fetch(`/api/projects/${projectId}/files`).then((res) => res.json()),
    ])
      .then(([projectData, filesData]) => {
        if (projectData.project) {
          setProject(projectData.project);
          setFiles(filesData.files || []);
        } else {
          setError("Project not found");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-24">
          <p className="text-muted-foreground">{error || "Project not found"}</p>
          <Button variant="ghost" asChild className="mt-4">
            <a href="/projects">Back to Projects</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="gap-2 mb-6 -ml-2">
        <a href="/projects">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </a>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground mt-1">
          {project.description || "No description"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Project Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Path</span>
              <code className="text-xs bg-secondary px-2 py-0.5 rounded">
                {project.path}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(project.updated_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Files ({files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files yet</p>
            ) : (
              <div className="space-y-1">
                {files.slice(0, 20).map((file) => (
                  <div
                    key={file}
                    className="text-sm font-mono text-muted-foreground py-1 px-2 rounded hover:bg-secondary transition-colors"
                  >
                    {file}
                  </div>
                ))}
                {files.length > 20 && (
                  <p className="text-xs text-muted-foreground pt-2">
                    + {files.length - 20} more files
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Run Instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Run the Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-secondary rounded-lg p-4 overflow-x-auto">
              <code className="text-foreground">
                {`cd ${project.path}\nbun install\nbun run dev`}
              </code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
