import { route } from "@ademattos/bunbox";
import { z } from "zod";
import { getProject } from "@/lib/db";

export const getProjectFiles = route
  .get()
  .params(z.object({ id: z.string() }))
  .handle(async ({ params }) => {
    const project = getProject(params.id);
    if (!project) {
      throw new Error("Project not found");
    }

    const files: string[] = [];
    try {
      const glob = new Bun.Glob("**/*");
      for await (const file of glob.scan({ cwd: project.path, onlyFiles: true })) {
        files.push(file);
      }
    } catch {
      // Project directory might not exist
    }

    return { files };
  });
