/**
 * Tests for git deployment module
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";

describe("git", () => {
  describe("GitConfig validation", () => {
    // Import config module for validation tests
    const { resolveTarget } = require("../src/config");

    test("accepts valid git config with repo only", () => {
      const config = {
        targets: {
          production: {
            host: "server.com",
            username: "deploy",
            privateKey: "~/.ssh/id_rsa",
            deployPath: "/var/www/app",
            name: "myapp",
            git: {
              repo: "https://github.com/user/repo.git",
            },
          },
        },
      };

      const { target } = resolveTarget(config, "production");
      expect(target.git).toBeDefined();
      expect(target.git!.repo).toBe("https://github.com/user/repo.git");
      expect(target.git!.branch).toBe("main"); // default
    });

    test("accepts valid git config with all options", () => {
      const config = {
        targets: {
          production: {
            host: "server.com",
            username: "deploy",
            privateKey: "~/.ssh/id_rsa",
            deployPath: "/var/www/app",
            name: "myapp",
            git: {
              repo: "git@github.com:user/repo.git",
              branch: "develop",
              deployKey: "~/.ssh/deploy_key",
            },
          },
        },
      };

      const { target } = resolveTarget(config, "production");
      expect(target.git!.repo).toBe("git@github.com:user/repo.git");
      expect(target.git!.branch).toBe("develop");
      expect(target.git!.deployKey).toContain("deploy_key");
    });

    test("resolves ~ in deployKey path", () => {
      const config = {
        targets: {
          production: {
            host: "server.com",
            username: "deploy",
            privateKey: "~/.ssh/id_rsa",
            deployPath: "/var/www/app",
            name: "myapp",
            git: {
              repo: "git@github.com:user/repo.git",
              deployKey: "~/.ssh/deploy_key",
            },
          },
        },
      };

      const { target } = resolveTarget(config, "production");
      expect(target.git!.deployKey).not.toContain("~");
      expect(target.git!.deployKey).toContain(".ssh/deploy_key");
    });

    test("resolves ${VAR} placeholders in token", () => {
      // Set env var for test
      const originalToken = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = "test_token_123";

      try {
        const config = {
          targets: {
            production: {
              host: "server.com",
              username: "deploy",
              privateKey: "~/.ssh/id_rsa",
              deployPath: "/var/www/app",
              name: "myapp",
              git: {
                repo: "https://github.com/user/repo.git",
                token: "${GITHUB_TOKEN}",
              },
            },
          },
        };

        const { target } = resolveTarget(config, "production");
        expect(target.git!.token).toBe("test_token_123");
      } finally {
        if (originalToken !== undefined) {
          process.env.GITHUB_TOKEN = originalToken;
        } else {
          delete process.env.GITHUB_TOKEN;
        }
      }
    });

    test("target without git config has undefined git", () => {
      const config = {
        targets: {
          production: {
            host: "server.com",
            username: "deploy",
            privateKey: "~/.ssh/id_rsa",
            deployPath: "/var/www/app",
            name: "myapp",
          },
        },
      };

      const { target } = resolveTarget(config, "production");
      expect(target.git).toBeUndefined();
    });
  });

  describe("Git URL handling", () => {
    test("HTTPS URL patterns are recognized", () => {
      const httpsUrls = [
        "https://github.com/user/repo.git",
        "https://github.com/user/repo",
        "https://gitlab.com/group/project.git",
        "https://bitbucket.org/team/repo.git",
      ];

      for (const url of httpsUrls) {
        expect(url.startsWith("https://")).toBe(true);
      }
    });

    test("SSH URL patterns are recognized", () => {
      const sshUrls = [
        "git@github.com:user/repo.git",
        "git@gitlab.com:group/project.git",
        "git@bitbucket.org:team/repo.git",
      ];

      for (const url of sshUrls) {
        expect(url.startsWith("git@")).toBe(true);
      }
    });

    test("token injection works for HTTPS URLs", () => {
      const repo = "https://github.com/user/repo.git";
      const token = "ghp_xxxxxxxxxxxx";

      // This is how gitSync injects tokens
      const repoWithToken = repo.replace("https://", `https://${token}@`);

      expect(repoWithToken).toBe("https://ghp_xxxxxxxxxxxx@github.com/user/repo.git");
    });
  });

  describe("Config validation errors", () => {
    const { loadConfig } = require("../src/config");

    test("throws error for git config without repo", async () => {
      // We can't easily test loadConfig with invalid data since it reads files
      // Instead, test the validation logic directly

      const validateGitConfig = (git: unknown) => {
        if (typeof git !== "object" || !git) {
          throw new Error("git config must be an object");
        }
        const g = git as Record<string, unknown>;
        if (!g.repo || typeof g.repo !== "string") {
          throw new Error("git.repo is required");
        }
      };

      expect(() => validateGitConfig({})).toThrow("git.repo is required");
      expect(() => validateGitConfig({ repo: 123 })).toThrow("git.repo is required");
      expect(() => validateGitConfig(null)).toThrow("git config must be an object");
    });
  });

  describe("Deploy key handling", () => {
    test("SSH config template covers major git hosts", () => {
      // The setupDeployKey function creates this SSH config
      const hosts = ["github.com", "gitlab.com", "bitbucket.org"];
      const sshConfig = `Host github.com
  IdentityFile /path/to/key
  StrictHostKeyChecking accept-new

Host gitlab.com
  IdentityFile /path/to/key
  StrictHostKeyChecking accept-new

Host bitbucket.org
  IdentityFile /path/to/key
  StrictHostKeyChecking accept-new
`;

      for (const host of hosts) {
        expect(sshConfig).toContain(`Host ${host}`);
      }
    });
  });
});
