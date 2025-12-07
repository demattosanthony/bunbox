/**
 * Git-based deployment functions
 * Clone repositories to server instead of rsync'ing files
 */

import type { SSHClient } from "./ssh";
import type { ResolvedTarget } from "./config";
import { readFileSync } from "fs";

/**
 * Check if git is installed on the server
 */
export async function isGitInstalled(ssh: SSHClient): Promise<boolean> {
  return ssh.commandExists("git");
}

/**
 * Setup deploy key on server for private SSH repos
 * Creates .ssh directory in deploy path and configures SSH to use the key
 */
export async function setupDeployKey(
  ssh: SSHClient,
  localKeyPath: string,
  deployPath: string
): Promise<void> {
  // Read local deploy key
  const keyContent = readFileSync(localKeyPath, "utf-8");

  // Create .ssh directory in deploy path
  await ssh.exec(`mkdir -p ${deployPath}/.ssh`);

  const remoteKeyPath = `${deployPath}/.ssh/deploy_key`;

  // Write key to server (escaped for shell)
  const escaped = keyContent.replace(/'/g, "'\"'\"'");
  await ssh.exec(`echo '${escaped}' > ${remoteKeyPath}`);
  await ssh.exec(`chmod 600 ${remoteKeyPath}`);

  // Configure SSH to use this key for GitHub
  const sshConfig = `Host github.com
  IdentityFile ${remoteKeyPath}
  StrictHostKeyChecking accept-new

Host gitlab.com
  IdentityFile ${remoteKeyPath}
  StrictHostKeyChecking accept-new

Host bitbucket.org
  IdentityFile ${remoteKeyPath}
  StrictHostKeyChecking accept-new
`;

  await ssh.exec(`echo '${sshConfig}' > ${deployPath}/.ssh/config`);
  await ssh.exec(`chmod 600 ${deployPath}/.ssh/config`);
}

/**
 * Clone repository to the release directory
 * Supports public repos, private repos with deploy keys, and private repos with tokens
 */
export async function gitSync(
  ssh: SSHClient,
  target: ResolvedTarget,
  releaseDir: string
): Promise<void> {
  const git = target.git!;

  // Build the repo URL
  let repoUrl = git.repo;

  // For HTTPS private repos, inject token into URL
  if (git.token && repoUrl.startsWith("https://")) {
    // https://github.com/user/repo → https://TOKEN@github.com/user/repo
    repoUrl = repoUrl.replace("https://", `https://${git.token}@`);
  }

  // Set GIT_SSH_COMMAND if using deploy key
  const gitEnv = git.deployKey
    ? `GIT_SSH_COMMAND='ssh -i ${target.deployPath}/.ssh/deploy_key -o StrictHostKeyChecking=accept-new'`
    : "";

  // Clone with shallow depth (we don't need history on server)
  const cloneCmd = `${gitEnv} git clone --depth 1 --branch ${git.branch} ${repoUrl} ${releaseDir}`;

  const result = await ssh.exec(cloneCmd);

  if (result.code !== 0) {
    // Redact token from error message if present
    const stderr = git.token
      ? result.stderr.replace(git.token, "[REDACTED]")
      : result.stderr;
    throw new Error(`Git clone failed: ${stderr}`);
  }

  // Remove .git directory (not needed on server, saves space)
  await ssh.exec(`rm -rf ${releaseDir}/.git`);
}

/**
 * Test if the repository is accessible from the server
 * Useful for validating config before first deploy
 */
export async function testRepoAccess(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<{ success: boolean; error?: string }> {
  const git = target.git!;

  let repoUrl = git.repo;
  if (git.token && repoUrl.startsWith("https://")) {
    repoUrl = repoUrl.replace("https://", `https://${git.token}@`);
  }

  const gitEnv = git.deployKey
    ? `GIT_SSH_COMMAND='ssh -i ${target.deployPath}/.ssh/deploy_key -o StrictHostKeyChecking=accept-new'`
    : "";

  // Use git ls-remote to test access without cloning
  const result = await ssh.exec(
    `${gitEnv} git ls-remote --exit-code ${repoUrl} HEAD`
  );

  if (result.code !== 0) {
    const stderr = git.token
      ? result.stderr.replace(git.token, "[REDACTED]")
      : result.stderr;
    return { success: false, error: stderr };
  }

  return { success: true };
}
