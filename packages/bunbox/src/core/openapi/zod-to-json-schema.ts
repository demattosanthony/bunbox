/**
 * Zero-dependency Zod to JSON Schema converter
 * Converts Zod schemas to JSON Schema for OpenAPI spec generation
 */

export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  const?: unknown;
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  description?: string;
  default?: unknown;
  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  nullable?: boolean;
  [key: string]: unknown;
}

interface ZodDef {
  typeName?: string;
  type?: string; // Zod 4 uses type instead of typeName
  description?: string;
  checks?: Array<{ kind?: string; value?: unknown; regex?: RegExp; message?: string; def?: Record<string, unknown> }>;
  shape?: (() => Record<string, unknown>) | Record<string, unknown>; // Zod 4: object, Zod 3: function
  values?: unknown[];
  entries?: Record<string, unknown>; // Zod 4 enum entries
  value?: unknown;
  options?: unknown[];
  left?: unknown;
  right?: unknown;
  innerType?: unknown;
  defaultValue?: () => unknown;
  valueType?: unknown;
  keyType?: unknown;
  items?: unknown[];
  rest?: unknown;
  discriminator?: string;
}

// Format kind → JSON Schema format mapping
const FORMAT_MAP: Record<string, string> = {
  email: "email",
  url: "uri",
  uuid: "uuid",
  cuid: "cuid",
  cuid2: "cuid",
  ulid: "ulid",
  datetime: "date-time",
  date: "date",
  time: "time",
};

/**
 * Extract string format checks from Zod definition
 * Supports both Zod 3 and Zod 4 check structures
 */
function extractStringChecks(def: ZodDef): Partial<JSONSchema> {
  const result: Partial<JSONSchema> = {};

  for (const check of def.checks || []) {
    const kind = check.kind || check.def?.check;
    const value = check.value ?? check.def?.minimum ?? check.def?.maximum;
    const format = check.def?.format;

    // Handle Zod 4 format checks directly
    if (typeof format === "string") {
      result.format = FORMAT_MAP[format] || format;
      continue;
    }

    // Length constraints
    if (kind === "min" || kind === "string_min") {
      result.minLength = value as number;
    } else if (kind === "max" || kind === "string_max") {
      result.maxLength = value as number;
    } else if (kind === "length") {
      result.minLength = result.maxLength = value as number;
    }
    // Format checks (use lookup table)
    else if (typeof kind === "string" && FORMAT_MAP[kind]) {
      result.format = FORMAT_MAP[kind];
    } else if (kind === "string_format" && typeof check.def?.format === "string") {
      result.format = FORMAT_MAP[check.def.format] || check.def.format;
    }
    // IP addresses (special handling for version)
    else if (kind === "ip") {
      result.format = value === "v4" ? "ipv4" : value === "v6" ? "ipv6" : "ip";
    }
    // Pattern constraints
    else if (kind === "regex" && check.regex) {
      result.pattern = check.regex.source;
    } else if (kind === "startsWith") {
      result.pattern = `^${escapeRegex(value as string)}`;
    } else if (kind === "endsWith") {
      result.pattern = `${escapeRegex(value as string)}$`;
    } else if (kind === "includes") {
      result.pattern = escapeRegex(value as string);
    }
  }

  return result;
}

/**
 * Extract number checks from Zod definition
 */
function extractNumberChecks(def: ZodDef): Partial<JSONSchema> {
  const result: Partial<JSONSchema> = {};
  const checks = def.checks || [];

  for (const check of checks) {
    switch (check.kind) {
      case "min":
        result.minimum = check.value as number;
        break;
      case "max":
        result.maximum = check.value as number;
        break;
      case "int":
        result.type = "integer";
        break;
      case "multipleOf":
        result.multipleOf = check.value as number;
        break;
      case "finite":
        // JSON doesn't support Infinity, so this is implicitly satisfied
        break;
    }
  }

  return result;
}

/**
 * Extract array checks from Zod definition
 */
function extractArrayChecks(def: ZodDef): Partial<JSONSchema> {
  const result: Partial<JSONSchema> = {};
  const checks = def.checks || [];

  for (const check of checks) {
    switch (check.kind) {
      case "min":
        result.minItems = check.value as number;
        break;
      case "max":
        result.maxItems = check.value as number;
        break;
      case "length":
        result.minItems = check.value as number;
        result.maxItems = check.value as number;
        break;
    }
  }

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convert a Zod object schema to JSON Schema
 * Supports both Zod 3 (shape as function) and Zod 4 (shape as object)
 */
function convertObject(def: ZodDef): JSONSchema {
  // Zod 3: shape is a function, Zod 4: shape is an object
  const shape = typeof def.shape === "function" ? def.shape() : def.shape || {};
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const fieldDef = (value as { _def?: ZodDef; def?: ZodDef })._def || (value as { def?: ZodDef }).def;
    const fieldType = fieldDef?.typeName || fieldDef?.type;
    const isOptional = fieldType === "ZodOptional" || fieldType === "optional";
    const isDefault = fieldType === "ZodDefault" || fieldType === "default";

    properties[key] = zodToJsonSchema(value);

    // Field is required unless it's optional or has a default
    if (!isOptional && !isDefault) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Convert a Zod schema to JSON Schema
 * Supports both Zod 3 (typeName) and Zod 4 (type) structures
 */
export function zodToJsonSchema(schema: unknown): JSONSchema {
  // Zod 4 has def at schema.def, Zod 3 has it at schema._def
  const def = (schema as { _def?: ZodDef; def?: ZodDef })?._def ||
              (schema as { def?: ZodDef })?.def;

  // Zod 3 uses typeName, Zod 4 uses type
  const typeName = def?.typeName || def?.type;
  if (!typeName) {
    return {};
  }

  // Handle description at any level
  const baseSchema: Partial<JSONSchema> = {};
  if (def?.description) {
    baseSchema.description = def.description;
  }

  // Normalize type names (Zod 4 uses lowercase without 'Zod' prefix)
  const normalizedType = typeName.startsWith("Zod") ? typeName : `Zod${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`;

  switch (normalizedType) {
    case "ZodString": {
      const checks = extractStringChecks(def);
      return { type: "string", ...baseSchema, ...checks };
    }

    case "ZodNumber": {
      const checks = extractNumberChecks(def);
      // type might be overridden to "integer" by checks
      return { type: "number", ...baseSchema, ...checks };
    }

    case "ZodBoolean":
      return { type: "boolean", ...baseSchema };

    case "ZodNull":
      return { type: "null", ...baseSchema };

    case "ZodUndefined":
    case "ZodVoid":
    case "ZodNever":
      return { ...baseSchema };

    case "ZodAny":
    case "ZodUnknown":
      return { ...baseSchema };

    case "ZodLiteral":
      return { const: def.value, ...baseSchema };

    case "ZodEnum":
      // Zod 3 uses values array, Zod 4 uses entries object
      const enumValues = def.values || (def.entries ? Object.values(def.entries) : []);
      return { enum: enumValues, ...baseSchema };

    case "ZodNativeEnum": {
      // Native enums store values in def.values
      const values = def.values ? Object.values(def.values) : [];
      return { enum: values.filter((v) => typeof v !== "number" || !values.includes(String(v))), ...baseSchema };
    }

    case "ZodObject":
      return { ...convertObject(def), ...baseSchema };

    case "ZodArray": {
      const itemSchema = zodToJsonSchema(def.type);
      const checks = extractArrayChecks(def);
      return { type: "array", items: itemSchema, ...baseSchema, ...checks };
    }

    case "ZodTuple": {
      const items = (def.items || []).map((item: unknown) => zodToJsonSchema(item));
      const result: JSONSchema = {
        type: "array",
        items: items.length === 1 ? items[0] : undefined,
        ...baseSchema,
      };
      if (items.length > 1) {
        result.prefixItems = items;
        result.minItems = items.length;
        result.maxItems = def.rest ? undefined : items.length;
        if (def.rest) {
          result.items = zodToJsonSchema(def.rest);
        }
      }
      return result;
    }

    case "ZodUnion":
    case "ZodDiscriminatedUnion": {
      const options = (def.options || []).map((opt: unknown) => zodToJsonSchema(opt));
      return { oneOf: options, ...baseSchema };
    }

    case "ZodIntersection": {
      const left = zodToJsonSchema(def.left);
      const right = zodToJsonSchema(def.right);
      return { allOf: [left, right], ...baseSchema };
    }

    case "ZodRecord": {
      const valueSchema = zodToJsonSchema(def.valueType);
      return {
        type: "object",
        additionalProperties: valueSchema,
        ...baseSchema,
      };
    }

    case "ZodMap":
    case "ZodSet":
      // Maps and Sets don't have direct JSON Schema equivalents
      return { type: "object", ...baseSchema };

    case "ZodOptional": {
      // Just return the inner type schema - optionality is handled at the object level
      // Zod 4: innerType is the actual schema object, not just a def
      const inner = def.innerType;
      return zodToJsonSchema(inner);
    }

    case "ZodNullable": {
      const inner = zodToJsonSchema(def.innerType);
      // OpenAPI 3.1 supports type arrays
      if (inner.type && typeof inner.type === "string") {
        return { ...inner, type: [inner.type, "null"], ...baseSchema };
      }
      return { oneOf: [inner, { type: "null" }], ...baseSchema };
    }

    case "ZodDefault": {
      const inner = zodToJsonSchema(def.innerType);
      // Zod 3: defaultValue is a function, Zod 4: defaultValue is the actual value
      const defaultValue = typeof def.defaultValue === "function"
        ? def.defaultValue()
        : def.defaultValue;
      return { ...inner, default: defaultValue, ...baseSchema };
    }

    case "ZodEffects":
    case "ZodLazy":
    case "ZodBranded":
    case "ZodPipeline":
    case "ZodReadonly":
      // These are wrappers - extract the inner type
      return zodToJsonSchema(def.innerType || (def as { schema?: unknown }).schema);

    case "ZodPromise":
      // Return the inner type schema
      return zodToJsonSchema(def.type);

    case "ZodDate":
      return { type: "string", format: "date-time", ...baseSchema };

    case "ZodBigInt":
      return { type: "integer", format: "int64", ...baseSchema };

    default:
      // Graceful fallback for unknown types
      return { ...baseSchema };
  }
}

/**
 * Check if a value looks like a Zod schema
 * Supports both Zod 3 (typeName) and Zod 4 (type) structures
 */
export function isZodSchema(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("_def" in value)) {
    return false;
  }
  const def = (value as { _def?: { typeName?: string; type?: string } })._def;
  // Zod 3 uses typeName, Zod 4 uses type
  return typeof def?.typeName === "string" || typeof def?.type === "string";
}
