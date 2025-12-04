import { input, select, confirm } from "@inquirer/prompts";
import pc from "picocolors";

export interface ProjectConfig {
  projectName: string;
  template: "basic" | "tailwind" | "full";
  initGit: boolean;
  installDeps: boolean;
}

export interface PromptOptions {
  projectName?: string;
  template?: string;
  skipGit?: boolean;
  skipInstall?: boolean;
}

export async function gatherProjectConfig(
  options: PromptOptions = {}
): Promise<ProjectConfig> {
  console.log();
  console.log(pc.bold(pc.cyan("  Create Bunbox App")));
  console.log();

  // Project name
  const projectName =
    options.projectName ||
    (await input({
      message: "What is your project named?",
      default: "my-bunbox-app",
      validate: (value) => {
        if (!value.trim()) return "Project name is required";
        if (!/^[a-z0-9-_]+$/i.test(value)) {
          return "Project name can only contain letters, numbers, hyphens, and underscores";
        }
        return true;
      },
    }));

  // Template selection
  const template =
    options.template ||
    (await select({
      message: "Which template would you like to use?",
      choices: [
        {
          name: "Basic - Simple pages and API routes",
          value: "basic",
          description: "Minimal setup with pages, layouts, and API routes",
        },
        {
          name: "Tailwind - With Tailwind CSS + shadcn/ui",
          value: "tailwind",
          description: "Beautiful UI components with Tailwind CSS",
        },
        {
          name: "Full - Complete example with all features",
          value: "full",
          description: "WebSockets, streaming, SSR examples, and more",
        },
      ],
      default: "basic",
    }));

  // Git initialization - skip prompt if --skip-git was passed
  const initGit = options.skipGit
    ? false
    : await confirm({
        message: "Initialize a new git repository?",
        default: true,
      });

  // Dependency installation - skip prompt if --skip-install was passed
  const installDeps = options.skipInstall
    ? false
    : await confirm({
        message: "Install dependencies?",
        default: true,
      });

  return {
    projectName,
    template: template as ProjectConfig["template"],
    initGit,
    installDeps,
  };
}
