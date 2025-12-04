export async function initGit(projectPath: string): Promise<void> {
  const proc = Bun.spawn(["git", "init"], {
    cwd: projectPath,
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error("Failed to initialize git repository");
  }
}

export async function isGitInstalled(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["git", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
