/**
 * Runtime endpoints for OpenAPI spec and Swagger UI
 */

import { generateOpenAPISpec, type OpenAPIConfig } from "./generator";

/**
 * Create a handler that serves the OpenAPI JSON spec
 * Caches the spec after first generation
 */
export function createOpenAPIHandler(appDir: string, config?: OpenAPIConfig) {
  let cached: object | null = null;

  return async () => {
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const spec = await generateOpenAPISpec(appDir, config);
    cached = spec;

    return new Response(JSON.stringify(spec), {
      headers: { "Content-Type": "application/json" },
    });
  };
}

/**
 * Create a handler that serves Swagger UI
 * Loads Swagger UI from CDN - zero runtime dependencies
 */
export function createSwaggerUIHandler(
  specPath: string,
  config?: OpenAPIConfig
) {
  const title = config?.title || "API Documentation";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${specPath}",
        dom_id: "#swagger-ui",
        presets: [
          SwaggerUIBundle.presets.apis
        ],
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>`;

  return () =>
    new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
