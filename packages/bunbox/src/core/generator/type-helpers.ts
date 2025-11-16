/**
 * Type generation for API client
 */

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export interface ApiRouteMethodMeta {
  path: string;
  importName: string;
  method: string;
  typeAlias: string;
}

export interface ApiRouteTreeNode {
  children: Map<string, ApiRouteTreeNode>;
  methods: ApiRouteMethodMeta[];
}

/**
 * Generate type aliases extracting all types from api() generics
 */
export function generateTypeAliases(node: ApiRouteTreeNode): string[] {
  const lines: string[] = [];

  function traverse(obj: ApiRouteTreeNode) {
    for (const meta of obj.methods) {
      // Extract all types from api<Params, Query, Body, Response>
      lines.push(
        `type ${meta.typeAlias}_Params = typeof ${meta.importName}.${meta.method} extends { __types: { params: infer T } } ? T : any;`,
        `type ${meta.typeAlias}_Query = typeof ${meta.importName}.${meta.method} extends { __types: { query: infer T } } ? T : any;`,
        `type ${meta.typeAlias}_Body = typeof ${meta.importName}.${meta.method} extends { __types: { body: infer T } } ? T : any;`,
        `type ${meta.typeAlias}_Response = typeof ${meta.importName}.${meta.method} extends { __types: { response: infer T } } ? T : any;`
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
      `${indentStr}${meta.method}: (opts?: { params?: ${meta.typeAlias}_Params; query?: ${meta.typeAlias}_Query; body?: ${meta.typeAlias}_Body; headers?: HeadersInit }) => request<${meta.typeAlias}_Response>("${meta.method}", "${meta.path}", opts)`,
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
