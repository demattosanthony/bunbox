/**
 * OpenAPI 3.1 spec generator for Bunbox routes
 */

import { join } from "path";
import {
  zodToJsonSchema,
  isZodSchema,
  type JSONSchema,
} from "./zod-to-json-schema";

/**
 * OpenAPI configuration options
 */
export interface OpenAPIConfig {
  /** Whether OpenAPI is enabled */
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

interface RouteMeta {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  responses?: Record<string, { description: string }>;
}

interface HandlerWithMeta {
  __method?: string;
  __meta?: RouteMeta;
  __schemas?: {
    params?: unknown;
    query?: unknown;
    body?: unknown;
  };
}

interface Route {
  pattern: string;
  filepath: string;
}

function exportNameToSummary(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function inferTags(path: string): string[] {
  const segment = path
    .replace(/^\/api\//, "")
    .split("/")[0]
    ?.replace(/\[.*\]/g, "")
    .trim();
  return segment ? [segment] : [];
}

function toOpenAPIPath(routePath: string): string {
  return routePath.replace(/\[([^\]]+)\]/g, "{$1}");
}

function extractPathParams(
  routePath: string,
  paramsSchema?: unknown
): Parameter[] {
  const matches = routePath.match(/\[([^\]]+)\]/g) || [];
  const paramNames = matches.map((m) => m.slice(1, -1));

  const paramsJsonSchema =
    paramsSchema && isZodSchema(paramsSchema)
      ? zodToJsonSchema(paramsSchema)
      : null;

  return paramNames.map((name) => ({
    name,
    in: "path" as const,
    required: true,
    schema: paramsJsonSchema?.properties?.[name] || { type: "string" },
  }));
}

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
 * Scan API routes from app directory
 */
async function scanApiRoutes(appDir: string): Promise<Route[]> {
  const glob = new Bun.Glob("**/api/**/route.{ts,tsx,js,jsx}");
  const routes: Route[] = [];

  for await (const filepath of glob.scan({ cwd: appDir })) {
    const pattern =
      "/" +
      filepath
        .replace(/\/route\.(ts|tsx|js|jsx)$/, "")
        .replace(/\[([^\]]+)\]/g, ":$1");
    routes.push({ pattern, filepath });
  }

  return routes;
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
    const filePath = join(appDir, route.filepath);
    const absolutePath = filePath.startsWith("/")
      ? filePath
      : join(process.cwd(), filePath);

    let module: Record<string, unknown>;
    try {
      module = await import(absolutePath);
    } catch (error) {
      console.warn(`Failed to import route: ${route.filepath}`, error);
      continue;
    }

    const handlers = extractHandlers(module);
    if (handlers.length === 0) continue;

    const bunboxPath =
      "/" + route.filepath.replace(/\/route\.(ts|tsx|js|jsx)$/, "");
    const openApiPath = toOpenAPIPath(bunboxPath);

    if (!spec.paths[openApiPath]) {
      spec.paths[openApiPath] = {};
    }

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

      if (
        ["POST", "PUT", "PATCH"].includes(method) &&
        schemas?.body &&
        isZodSchema(schemas.body)
      ) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: zodToJsonSchema(schemas.body),
            },
          },
        };
      }

      if (operation.parameters?.length === 0) {
        delete operation.parameters;
      }

      const methodKey = method.toLowerCase() as keyof PathItem;
      spec.paths[openApiPath][methodKey] = operation;
    }
  }

  return spec;
}

/**
 * Write OpenAPI spec to file
 */
export async function writeOpenAPISpec(
  appDir: string,
  config?: OpenAPIConfig
): Promise<string> {
  const spec = await generateOpenAPISpec(appDir, config);
  const outputDir = join(process.cwd(), ".bunbox");
  const outputPath = join(outputDir, "openapi.json");

  await Bun.write(outputPath, JSON.stringify(spec, null, 2));

  return outputPath;
}
