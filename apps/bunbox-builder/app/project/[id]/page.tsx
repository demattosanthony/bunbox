import { ProjectDetail } from "./ProjectDetail";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Sparkles } from "lucide-react";

export const metadata = {
  title: "Project - Bunbox Builder",
  description: "Project details",
};

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-lg">Bunbox Builder</span>
          </a>
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

      <ProjectDetail projectId={params.id} />
    </div>
  );
}
