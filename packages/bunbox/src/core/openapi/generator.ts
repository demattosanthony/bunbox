/**
 * OpenAPI 3.1 spec generator for Bunbox routes
 */

import { join } from "path";
import { scanApiRoutes } from "../scanner";
import { resolveAbsolutePath } from "../utils";
import { zodToJsonSchema, isZodSchema, type JSONSchema } from "./zod-to-json-schema";
import type { RouteMeta } from "../route";

/**
 * OpenAPI configuration options
 */
export interface OpenAPIConfig {
  enabled?: boolean;
  /** Base path for docs endpoints (default: '/api/docs') */
  path?: string;
  /** API title */
  title?: string;
  /** API version */
  version?: string;
  /** API description */
  description?: string;
  /** Server URLs */
  servers?: Array<{ url: string; description?: string }>;
}

/**
 * OpenAPI 3.1 specification
 */
export interface OpenAPISpec {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

interface Operation {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ResponseObject>;
}

interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema?: JSONSchema;
  description?: string;
}

interface RequestBody {
  required?: boolean;
  content: {
    "application/json": {
      schema: JSONSchema;
    };
  };
}

interface ResponseObject {
  description: string;
  content?: {
    "application/json"?: {
      schema?: JSONSchema;
    };
  };
}

/**
 * Handler with OpenAPI metadata attached
 */
interface HandlerWithMeta {
  __method?: string;
  __meta?: RouteMeta;
  __schemas?: {
    params?: unknown;
    query?: unknown;
    body?: unknown;
  };
}

/**
 * Convert export name to human-readable summary
 * listUsers -> "List users"
 * getUserById -> "Get user by id"
 */
function exportNameToSummary(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Infer tags from route path
 * /api/users/[id] -> ['users']
 */
function inferTags(path: string): string[] {
  const segment = path
    .replace(/^\/api\//, "")
    .split("/")[0]
    ?.replace(/\[.*\]/g, "")
    .trim();
  return segment ? [segment] : [];
}

/**
 * Convert Bunbox route pattern to OpenAPI path
 * /api/users/[id] -> /api/users/{id}
 */
function toOpenAPIPath(routePath: string): string {
  return routePath.replace(/\[([^\]]+)\]/g, "{$1}");
}

/**
 * Extract path parameters from route pattern
 * /api/users/[id]/posts/[postId] -> [{name: 'id'}, {name: 'postId'}]
 */
function extractPathParams(routePath: string, paramsSchema?: unknown): Parameter[] {
  const matches = routePath.match(/\[([^\]]+)\]/g) || [];
  const paramNames = matches.map((m) => m.slice(1, -1));

  // Try to get schema for each param from paramsSchema
  const paramsJsonSchema = paramsSchema && isZodSchema(paramsSchema)
    ? zodToJsonSchema(paramsSchema)
    : null;

  return paramNames.map((name) => ({
    name,
    in: "path" as const,
    required: true,
    schema: paramsJsonSchema?.properties?.[name] || { type: "string" },
  }));
}

/**
 * Build query parameters from schema
 */
function buildQueryParams(querySchema?: unknown): Parameter[] {
  if (!querySchema || !isZodSchema(querySchema)) {
    return [];
  }

  const jsonSchema = zodToJsonSchema(querySchema);
  if (jsonSchema.type !== "object" || !jsonSchema.properties) {
    return [];
  }

  const required = new Set(jsonSchema.required || []);
  return Object.entries(jsonSchema.properties).map(([name, schema]) => ({
    name,
    in: "query" as const,
    required: required.has(name),
    schema,
    description: schema.description,
  }));
}

type HandlerInfo = {
  exportName: string;
  method: string;
  meta?: RouteMeta;
  schemas?: { params?: unknown; query?: unknown; body?: unknown };
};

/**
 * Extract handlers with metadata from a module
 */
function extractHandlers(module: Record<string, unknown>): HandlerInfo[] {
  const handlers: HandlerInfo[] = [];

  for (const [exportName, value] of Object.entries(module)) {
    if (typeof value !== "function") continue;

    const handler = value as HandlerWithMeta;
    if (!handler.__method) continue;

    handlers.push({
      exportName,
      method: handler.__method,
      meta: handler.__meta,
      schemas: handler.__schemas,
    });
  }

  return handlers;
}

/**
 * Generate OpenAPI specification from Bunbox routes
 */
export async function generateOpenAPISpec(
  appDir: string,
  config?: OpenAPIConfig
): Promise<OpenAPISpec> {
  const apiRoutes = await scanApiRoutes(appDir);

  const spec: OpenAPISpec = {
    openapi: "3.1.0",
    info: {
      title: config?.title || "Bunbox API",
      version: config?.version || "1.0.0",
      ...(config?.description ? { description: config.description } : {}),
    },
    ...(config?.servers?.length ? { servers: config.servers } : {}),
    paths: {},
  };

  for (const route of apiRoutes) {
    // Build absolute path to route file (same pattern as server.ts)
    const filePath = join(appDir, route.filepath);
    const absolutePath = resolveAbsolutePath(filePath);

    // Dynamic import the route module
    let module: Record<string, unknown>;
    try {
      module = await import(absolutePath);
    } catch (error) {
      console.warn(`Failed to import route: ${route.filepath}`, error);
      continue;
    }

    // Extract handlers from module
    const handlers = extractHandlers(module);
    if (handlers.length === 0) continue;

    // Build route path in Bunbox format for helper functions
    const bunboxPath = "/" + route.filepath.replace(/\/route\.(ts|tsx|js|jsx)$/, "");
    // Convert to OpenAPI format for the spec
    const openApiPath = toOpenAPIPath(bunboxPath);

    // Initialize path item
    if (!spec.paths[openApiPath]) {
      spec.paths[openApiPath] = {};
    }

    // Add each handler as an operation
    for (const { exportName, method, meta, schemas } of handlers) {
      const operation: Operation = {
        operationId: meta?.operationId || exportName,
        summary: meta?.summary || exportNameToSummary(exportName),
        ...(meta?.description ? { description: meta.description } : {}),
        tags: meta?.tags || inferTags(bunboxPath),
        ...(meta?.deprecated ? { deprecated: true } : {}),
        parameters: [
          ...extractPathParams(bunboxPath, schemas?.params),
          ...buildQueryParams(schemas?.query),
        ],
        responses: {
          "200": { description: "Successful response" },
          ...(meta?.responses
            ? Object.fromEntries(
                Object.entries(meta.responses).map(([code, resp]) => [
                  code,
                  { description: resp.description },
                ])
              )
            : {}),
        },
      };

      // Add request body for POST, PUT, PATCH
      if (["POST", "PUT", "PATCH"].includes(method) && schemas?.body && isZodSchema(schemas.body)) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: zodToJsonSchema(schemas.body),
            },
          },
        };
      }

      // Remove empty parameters array
      if (operation.parameters?.length === 0) {
        delete operation.parameters;
      }

      // Add to path item
      const methodKey = method.toLowerCase() as keyof PathItem;
      spec.paths[openApiPath][methodKey] = operation;
    }
  }

  return spec;
}
