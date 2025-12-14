import { getProject } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderOpen, Sparkles, FileCode, Terminal, ArrowLeft } from "lucide-react";
import type { Project } from "@/lib/db/schema";

export async function loader({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) {
    throw new Error("Project not found");
  }

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
  data,
}: {
  data: { project: Project; files: string[] };
}) {
  const { project, files } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold text-lg">Bunbox Builder</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <a href="/">
              <Plus className="w-4 h-4" />
              New
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <a href="/projects">
              <FolderOpen className="w-4 h-4" />
              Projects
            </a>
          </Button>
        </nav>
      </header>

      {/* Content */}
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
    </div>
  );
}
