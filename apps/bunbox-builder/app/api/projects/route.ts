import { route } from "@ademattos/bunbox";
import { z } from "zod";
import { listProjects, createProject, getProject } from "@/lib/db";
import { getProjectPath, initializeProject } from "@/lib/agent/client";

export const getProjects = route.get().handle(() => {
  const projects = listProjects();
  return { projects };
});

export const createNewProject = route
  .post()
  .body(
    z.object({
      name: z.string().min(1),
      description: z.string().optional()
    })
  )
  .handle(async ({ body }) => {
    const projectPath = getProjectPath(body.name);
    await initializeProject(projectPath, body.name);
    const project = createProject(body.name, projectPath, body.description);
    return { project };
  });
