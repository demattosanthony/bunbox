import { listProjects } from "@/lib/db";
import { ProjectsList } from "./ProjectsList";

export const metadata = {
  title: "Projects - Bunbox Builder",
  description: "Your created bunbox projects"
};

export async function loader() {
  const projects = listProjects();
  return { projects };
}

export default function ProjectsPage({
  data
}: {
  data: Awaited<ReturnType<typeof loader>>;
}) {
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
          <h1>Your Projects</h1>
        </div>

        <ProjectsList initialProjects={data.projects} />
      </div>
    </div>
  );
}
