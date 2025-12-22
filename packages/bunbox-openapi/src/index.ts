/**
 * Bunbox OpenAPI Plugin
 *
 * Provides OpenAPI/Swagger documentation for your Bunbox API routes.
 *
 * @example
 * ```typescript
 * // bunbox.config.ts
 * import { openapi } from "@ademattos/bunbox-openapi";
 *
 * export default defineConfig({
 *   plugins: [
 *     openapi({
 *       title: "My API",
 *       version: "1.0.0",
 *     }),
 *   ],
 * });
 * ```
 */

export {
  zodToJsonSchema,
  isZodSchema,
  type JSONSchema,
} from "./zod-to-json-schema";

export {
  generateOpenAPISpec,
  writeOpenAPISpec,
  type OpenAPIConfig,
  type OpenAPISpec,
} from "./generator";

export { createOpenAPIHandler, createSwaggerUIHandler } from "./runtime";

import type { OpenAPIConfig } from "./generator";
import { createOpenAPIHandler, createSwaggerUIHandler } from "./runtime";

export interface OpenAPIPluginOptions extends OpenAPIConfig {
  /** Base path for docs endpoints (default: '/api/docs') */
  path?: string;
}

/**
 * OpenAPI plugin for Bunbox
 *
 * Adds automatic OpenAPI spec generation and Swagger UI to your Bunbox app.
 *
 * @example
 * ```typescript
 * import { openapi } from "@ademattos/bunbox-openapi";
 *
 * // In your server setup or config
 * const openapiPlugin = openapi({
 *   title: "My API",
 *   version: "1.0.0",
 *   description: "My awesome API",
 * });
 * ```
 */
export function openapi(options: OpenAPIPluginOptions = {}) {
  const basePath = options.path || "/api/docs";
  const specPath = `${basePath}/openapi.json`;

  return {
    name: "bunbox-openapi",
    config: options,

    /**
     * Get the routes to register for OpenAPI endpoints
     */
    getRoutes(appDir: string) {
      return [
        {
          path: basePath,
          handler: createSwaggerUIHandler(specPath, options),
        },
        {
          path: specPath,
          handler: createOpenAPIHandler(appDir, options),
        },
      ];
    },

    /**
     * Check if a request path matches OpenAPI routes
     */
    matchesRoute(pathname: string): boolean {
      return pathname === basePath || pathname === specPath;
    },

    /**
     * Handle an OpenAPI request
     */
    async handleRequest(
      pathname: string,
      appDir: string
    ): Promise<Response | null> {
      if (pathname === specPath) {
        const handler = createOpenAPIHandler(appDir, options);
        return handler();
      }

      if (pathname === basePath) {
        const handler = createSwaggerUIHandler(specPath, options);
        return handler();
      }

      return null;
    },
  };
}

export type OpenAPIPlugin = ReturnType<typeof openapi>;
