/**
 * Tests for SSR directive detection
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { checkUseServer, checkUseClient } from "../../src/core/ssr";

describe("SSR directive detection", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bunbox-ssr-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("checkUseServer", () => {
    test("detects 'use server' directive with double quotes", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `"use server";\nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });

    test("detects 'use server' directive with single quotes", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `'use server';\nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });

    test("detects 'use server' directive without semicolon", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `"use server"\nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });

    test("returns false for files without 'use server' directive", async () => {
      const filePath = join(tempDir, "client-page.tsx");
      await writeFile(filePath, `export default function Page() { return <h1>Client</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(false);
    });

    test("returns false for 'use client' files", async () => {
      const filePath = join(tempDir, "client-component.tsx");
      await writeFile(filePath, `"use client";\nexport default function Component() { return <h1>Client</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(false);
    });

    test("returns false for non-existent files", async () => {
      const result = await checkUseServer(join(tempDir, "non-existent.tsx"));
      expect(result).toBe(false);
    });

    test("allows directive after imports (standard RSC pattern)", async () => {
      const filePath = join(tempDir, "page.tsx");
      await writeFile(filePath, `import React from 'react';\n"use server";\nexport default function Page() { return <h1>Page</h1>; }`);

      // Directive after imports is valid (Next.js RSC pattern)
      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });

    test("ignores directive after non-import code", async () => {
      const filePath = join(tempDir, "page.tsx");
      await writeFile(filePath, `const x = 1;\n"use server";\nexport default function Page() { return <h1>Page</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(false);
    });

    test("allows directive after comments", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `// This is a comment\n"use server";\nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });

    test("allows directive after empty lines", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `\n\n"use server";\nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });
  });

  describe("checkUseClient", () => {
    test("detects 'use client' directive with double quotes", async () => {
      const filePath = join(tempDir, "client-component.tsx");
      await writeFile(filePath, `"use client";\nexport default function Component() { return <h1>Client</h1>; }`);

      const result = await checkUseClient(filePath);
      expect(result).toBe(true);
    });

    test("detects 'use client' directive with single quotes", async () => {
      const filePath = join(tempDir, "client-component.tsx");
      await writeFile(filePath, `'use client';\nexport default function Component() { return <h1>Client</h1>; }`);

      const result = await checkUseClient(filePath);
      expect(result).toBe(true);
    });

    test("returns false for files without 'use client' directive", async () => {
      const filePath = join(tempDir, "page.tsx");
      await writeFile(filePath, `export default function Page() { return <h1>Page</h1>; }`);

      const result = await checkUseClient(filePath);
      expect(result).toBe(false);
    });

    test("returns false for 'use server' files", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `"use server";\nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseClient(filePath);
      expect(result).toBe(false);
    });

    test("returns false for non-existent files", async () => {
      const result = await checkUseClient(join(tempDir, "non-existent.tsx"));
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles file with only directive", async () => {
      const filePath = join(tempDir, "minimal.tsx");
      await writeFile(filePath, `"use server";`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });

    test("handles empty file", async () => {
      const filePath = join(tempDir, "empty.tsx");
      await writeFile(filePath, "");

      const serverResult = await checkUseServer(filePath);
      const clientResult = await checkUseClient(filePath);
      expect(serverResult).toBe(false);
      expect(clientResult).toBe(false);
    });

    test("handles file with whitespace only", async () => {
      const filePath = join(tempDir, "whitespace.tsx");
      await writeFile(filePath, "   \n   \n   ");

      const serverResult = await checkUseServer(filePath);
      const clientResult = await checkUseClient(filePath);
      expect(serverResult).toBe(false);
      expect(clientResult).toBe(false);
    });

    test("handles directive with trailing whitespace", async () => {
      const filePath = join(tempDir, "server-page.tsx");
      await writeFile(filePath, `"use server";   \nexport default function Page() { return <h1>SSR</h1>; }`);

      const result = await checkUseServer(filePath);
      expect(result).toBe(true);
    });
  });
});
