import { route } from "@ademattos/bunbox";
import { z } from "zod";
import { getProject, updateProject, deleteProject } from "@/lib/db";

export const getProjectById = route
  .get()
  .params(z.object({ id: z.string() }))
  .handle(({ params }) => {
    const project = getProject(params.id);
    if (!project) {
      throw new Error("Project not found");
    }
    return { project };
  });

export const updateProjectById = route
  .put()
  .params(z.object({ id: z.string() }))
  .body(
    z.object({
      name: z.string().optional(),
      description: z.string().optional()
    })
  )
  .handle(({ params, body }) => {
    const project = updateProject(params.id, body);
    if (!project) {
      throw new Error("Project not found");
    }
    return { project };
  });

export const deleteProjectById = route
  .delete()
  .params(z.object({ id: z.string() }))
  .handle(({ params }) => {
    deleteProject(params.id);
    return { success: true };
  });
