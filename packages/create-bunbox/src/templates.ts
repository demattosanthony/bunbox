import { join, dirname } from "path";
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "fs/promises";

const TEMPLATES_DIR = join(import.meta.dir, "..", "templates");

// Current bunbox version - update this when releasing
const BUNBOX_VERSION = "^0.2.6";

export async function copyTemplate(
  templateName: string,
  destPath: string,
  projectName: string
) {
  const templatePath = join(TEMPLATES_DIR, templateName);
  await copyDirectory(templatePath, destPath, projectName);
}

async function copyDirectory(src: string, dest: string, projectName: string) {
  await mkdir(dest, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    let destName = entry.name;

    // Handle template files - remove .template extension
    if (entry.name.endsWith(".template")) {
      destName = entry.name.replace(".template", "");
    }

    // Handle gitignore specially (npm strips .gitignore from packages)
    if (entry.name === "gitignore") {
      destName = ".gitignore";
    }

    const destPath = join(dest, destName);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, projectName);
    } else {
      await copyFileWithReplacements(srcPath, destPath, projectName);
    }
  }
}

async function copyFileWithReplacements(
  src: string,
  dest: string,
  projectName: string
) {
  // Check if file needs template processing
  const needsProcessing =
    src.endsWith(".template") ||
    src.endsWith("package.json") ||
    src.endsWith("README.md") ||
    isTextFile(src);

  if (needsProcessing) {
    const content = await readFile(src, "utf-8");
    const processed = content
      .replace(/\{\{projectName\}\}/g, projectName)
      .replace(/\{\{bunboxVersion\}\}/g, BUNBOX_VERSION);

    // Ensure directory exists
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, processed);
  } else {
    // Binary file - copy directly
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}

function isTextFile(path: string): boolean {
  const textExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".css",
    ".md",
    ".txt",
    ".html",
    ".toml",
    ".gitignore",
    ".svg",
  ];
  return textExtensions.some((ext) => path.endsWith(ext));
}

export function getAvailableTemplates(): string[] {
  return ["basic", "tailwind", "full"];
}
