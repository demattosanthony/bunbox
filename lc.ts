#!/usr/bin/env bun

import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

const BUNBOX_PATH = "./packages/bunbox/src";

function countLinesInFile(filepath: string): number {
  const content = readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and single-line comments
    if (
      trimmed &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("*") &&
      trimmed !== "/*" &&
      trimmed !== "*/"
    ) {
      count++;
    }
  }

  return count;
}

function scanDirectory(dir: string): number {
  let total = 0;

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry !== "node_modules") {
        total += scanDirectory(fullPath);
      }
    } else if (
      stat.isFile() &&
      (entry.endsWith(".ts") || entry.endsWith(".tsx"))
    ) {
      const lines = countLinesInFile(fullPath);
      total += lines;
    }
  }

  return total;
}

const totalLines = scanDirectory(BUNBOX_PATH);
console.log(`📦 Bunbox package: ${totalLines} lines of code`);
