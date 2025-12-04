import { existsSync } from "fs";
import { resolve } from "path";
import pc from "picocolors";
import { gatherProjectConfig, type ProjectConfig } from "./prompts";
import { copyTemplate, getAvailableTemplates } from "./templates";
import { initGit, isGitInstalled } from "./utils/git";
import { Spinner } from "./utils/spinner";

export interface CLIOptions {
  projectName?: string;
  template?: string;
  skipGit?: boolean;
  skipInstall?: boolean;
}

export async function runCLI(options: CLIOptions) {
  try {
    // Validate template if provided
    if (options.template) {
      const validTemplates = getAvailableTemplates();
      if (!validTemplates.includes(options.template)) {
        console.error(
          pc.red(`Error: Invalid template "${options.template}".`)
        );
        console.log(
          pc.dim(`Available templates: ${validTemplates.join(", ")}`)
        );
        process.exit(1);
      }
    }

    // Gather project configuration
    const config = await gatherProjectConfig({
      projectName: options.projectName,
      template: options.template,
      skipGit: options.skipGit,
      skipInstall: options.skipInstall,
    });

    const projectPath = resolve(process.cwd(), config.projectName);

    // Check if directory exists
    if (existsSync(projectPath)) {
      console.error(
        pc.red(`\nError: Directory "${config.projectName}" already exists.`)
      );
      console.log(
        pc.dim(
          "Please choose a different name or delete the existing directory."
        )
      );
      process.exit(1);
    }

    console.log();

    // Create project directory and copy template
    const spinner = new Spinner();
    spinner.start("Creating project structure...");

    await copyTemplate(config.template, projectPath, config.projectName);
    spinner.succeed("Project structure created");

    // Initialize git
    if (config.initGit) {
      const gitAvailable = await isGitInstalled();
      if (gitAvailable) {
        spinner.start("Initializing git repository...");
        await initGit(projectPath);
        spinner.succeed("Git repository initialized");
      } else {
        console.log(
          pc.yellow("  ⚠ Git not found, skipping repository initialization")
        );
      }
    }

    // Install dependencies
    if (config.installDeps) {
      spinner.start("Installing dependencies...");
      await installDependencies(projectPath);
      spinner.succeed("Dependencies installed");
    }

    // Print success message
    printSuccessMessage(config);
  } catch (error) {
    // Handle user cancellation (Ctrl+C)
    if (
      error instanceof Error &&
      (error.message.includes("User force closed") ||
        error.message.includes("prompt was canceled"))
    ) {
      console.log("\n" + pc.yellow("Setup cancelled."));
      process.exit(0);
    }

    console.error(pc.red("\nError:"), error);
    process.exit(1);
  }
}

async function installDependencies(projectPath: string) {
  const proc = Bun.spawn(["bun", "install"], {
    cwd: projectPath,
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;

  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to install dependencies: ${stderr}`);
  }
}

function printSuccessMessage(config: ProjectConfig) {
  console.log();
  console.log(pc.green("Success!") + ` Created ${pc.bold(config.projectName)}`);
  console.log();
  console.log("Next steps:");
  console.log();
  console.log(`  ${pc.cyan("cd")} ${config.projectName}`);

  if (!config.installDeps) {
    console.log(`  ${pc.cyan("bun install")}`);
  }

  console.log(`  ${pc.cyan("bun dev")}`);
  console.log();
  console.log(pc.dim("Happy coding with Bunbox!"));
  console.log();
}
