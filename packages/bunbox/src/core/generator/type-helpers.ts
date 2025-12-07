/**
 * Type generation for API client
 */

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export interface ApiRouteMethodMeta {
  path: string;
  /** The module import name (e.g., Route0) */
  importName: string;
  /** The actual export name in the module (e.g., listUsers) */
  exportName: string;
  /** The HTTP method (GET, POST, etc.) */
  method: string;
  typeAlias: string;
}

export interface ApiRouteTreeNode {
  children: Map<string, ApiRouteTreeNode>;
  methods: ApiRouteMethodMeta[];
}

/**
 * Generate type aliases extracted from route builder metadata
 */
export function generateTypeAliases(node: ApiRouteTreeNode): string[] {
  const lines: string[] = [];

  function traverse(obj: ApiRouteTreeNode) {
    for (const meta of obj.methods) {
      // Extract all types from route.handle chains (params/query/body/response)
      // Uses the actual export name (e.g., listUsers) not the method name
      // For Response: Try __types first (route.handle), then ReturnType (direct functions)
      lines.push(
        `type ${meta.typeAlias}_Params = typeof ${meta.importName}.${meta.exportName} extends { __types: { params: infer T } } ? T : Record<string, unknown>;`,
        `type ${meta.typeAlias}_Query = typeof ${meta.importName}.${meta.exportName} extends { __types: { query: infer T } } ? T : Record<string, unknown>;`,
        `type ${meta.typeAlias}_Body = typeof ${meta.importName}.${meta.exportName} extends { __types: { body: infer T } } ? T : unknown;`,
        `type ${meta.typeAlias}_Response = typeof ${meta.importName}.${meta.exportName} extends { __types: { response: infer T } } ? T : Awaited<ReturnType<typeof ${meta.importName}.${meta.exportName}>>;`
      );
    }

    for (const [, child] of Array.from(obj.children.entries())) {
      traverse(child);
    }
  }

  traverse(node);
  return lines;
}

/**
 * Build API object structure with proper types
 */
export function buildApiObject(
  node: ApiRouteTreeNode,
  indent: number
): string[] {
  const lines: string[] = [];
  const indentStr = "  ".repeat(indent);
  const blocks: string[][] = [];

  for (const meta of node.methods) {
    blocks.push([
      `${indentStr}${meta.method}: createApiMethod<${meta.typeAlias}_Response, ${meta.typeAlias}_Params, ${meta.typeAlias}_Query, ${meta.typeAlias}_Body>("${meta.method}", "${meta.path}")`,
    ]);
  }

  const childEntries = Array.from(node.children.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [key, child] of childEntries) {
    const quotedKey = /^:|[^a-zA-Z0-9_$]/.test(key) ? `"${key}"` : key;
    const childLines = buildApiObject(child, indent + 1);
    blocks.push([
      `${indentStr}${quotedKey}: {`,
      ...childLines,
      `${indentStr}}`,
    ]);
  }

  blocks.forEach((block, index) => {
    const isLast = index === blocks.length - 1;
    if (!isLast) {
      block[block.length - 1] = `${block[block.length - 1]},`;
    }
    lines.push(...block);
  });

  return lines;
}
