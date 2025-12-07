/**
 * OpenAPI 3.1 specification generator for Bunbox
 * Zero dependencies - generates from route definitions
 */

export { zodToJsonSchema, isZodSchema, type JSONSchema } from "./zod-to-json-schema";
export { generateOpenAPISpec, type OpenAPIConfig, type OpenAPISpec } from "./generator";
export { createOpenAPIHandler, createSwaggerUIHandler } from "./runtime";

import { join } from "path";
import { generateOpenAPISpec, type OpenAPIConfig } from "./generator";

/**
 * Write OpenAPI spec to file (build-time generation)
 */
export async function writeOpenAPISpec(
  appDir: string,
  config?: OpenAPIConfig
): Promise<string> {
  const spec = await generateOpenAPISpec(appDir, config);
  const outputDir = join(process.cwd(), ".bunbox");
  const outputPath = join(outputDir, "openapi.json");

  // Ensure .bunbox directory exists
  await Bun.write(outputPath, JSON.stringify(spec, null, 2));

  return outputPath;
}
