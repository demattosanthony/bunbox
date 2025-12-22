import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdir, rm } from "fs/promises";
import { zodToJsonSchema, isZodSchema } from "../../src/openapi/zod-to-json-schema";
import { generateOpenAPISpec } from "../../src/openapi/generator";

// Mock Zod schemas for testing
const mockZodString = () => ({
  _def: {
    typeName: "ZodString",
    checks: [],
  },
});

const mockZodNumber = () => ({
  _def: {
    typeName: "ZodNumber",
    checks: [],
  },
});

const mockZodBoolean = () => ({
  _def: {
    typeName: "ZodBoolean",
  },
});

const mockZodObject = (shape: Record<string, unknown>) => ({
  _def: {
    typeName: "ZodObject",
    shape: () => shape,
  },
});

const mockZodArray = (itemSchema: unknown) => ({
  _def: {
    typeName: "ZodArray",
    type: itemSchema,
    checks: [],
  },
});

const mockZodOptional = (innerSchema: unknown) => ({
  _def: {
    typeName: "ZodOptional",
    innerType: innerSchema,
  },
});

const mockZodStringWithChecks = (checks: Array<{ kind: string; value?: unknown }>) => ({
  _def: {
    typeName: "ZodString",
    checks,
  },
});

const mockZodNumberWithChecks = (checks: Array<{ kind: string; value?: unknown }>) => ({
  _def: {
    typeName: "ZodNumber",
    checks,
  },
});

describe("zodToJsonSchema", () => {
  test("converts ZodString to JSON Schema", () => {
    const schema = zodToJsonSchema(mockZodString());
    expect(schema).toEqual({ type: "string" });
  });

  test("converts ZodNumber to JSON Schema", () => {
    const schema = zodToJsonSchema(mockZodNumber());
    expect(schema).toEqual({ type: "number" });
  });

  test("converts ZodBoolean to JSON Schema", () => {
    const schema = zodToJsonSchema(mockZodBoolean());
    expect(schema).toEqual({ type: "boolean" });
  });

  test("converts ZodObject to JSON Schema", () => {
    const schema = zodToJsonSchema(
      mockZodObject({
        name: mockZodString(),
        age: mockZodNumber(),
      })
    );
    expect(schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
    });
  });

  test("converts ZodArray to JSON Schema", () => {
    const schema = zodToJsonSchema(mockZodArray(mockZodString()));
    expect(schema).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  test("handles optional fields correctly", () => {
    const schema = zodToJsonSchema(
      mockZodObject({
        required: mockZodString(),
        optional: mockZodOptional(mockZodNumber()),
      })
    );
    expect(schema.required).toEqual(["required"]);
    expect(schema.properties?.optional).toEqual({ type: "number" });
  });

  test("converts string with min/max checks", () => {
    const schema = zodToJsonSchema(
      mockZodStringWithChecks([
        { kind: "min", value: 5 },
        { kind: "max", value: 100 },
      ])
    );
    expect(schema).toEqual({
      type: "string",
      minLength: 5,
      maxLength: 100,
    });
  });

  test("converts string with email format", () => {
    const schema = zodToJsonSchema(mockZodStringWithChecks([{ kind: "email" }]));
    expect(schema).toEqual({
      type: "string",
      format: "email",
    });
  });

  test("converts string with url format", () => {
    const schema = zodToJsonSchema(mockZodStringWithChecks([{ kind: "url" }]));
    expect(schema).toEqual({
      type: "string",
      format: "uri",
    });
  });

  test("converts string with uuid format", () => {
    const schema = zodToJsonSchema(mockZodStringWithChecks([{ kind: "uuid" }]));
    expect(schema).toEqual({
      type: "string",
      format: "uuid",
    });
  });

  test("converts number with int check to integer type", () => {
    const schema = zodToJsonSchema(mockZodNumberWithChecks([{ kind: "int" }]));
    expect(schema.type).toBe("integer");
  });

  test("converts number with min/max checks", () => {
    const schema = zodToJsonSchema(
      mockZodNumberWithChecks([
        { kind: "min", value: 0 },
        { kind: "max", value: 100 },
      ])
    );
    expect(schema).toEqual({
      type: "number",
      minimum: 0,
      maximum: 100,
    });
  });

  test("handles ZodLiteral", () => {
    const schema = zodToJsonSchema({
      _def: {
        typeName: "ZodLiteral",
        value: "active",
      },
    });
    expect(schema).toEqual({ const: "active" });
  });

  test("handles ZodEnum", () => {
    const schema = zodToJsonSchema({
      _def: {
        typeName: "ZodEnum",
        values: ["pending", "active", "complete"],
      },
    });
    expect(schema).toEqual({ enum: ["pending", "active", "complete"] });
  });

  test("handles ZodNullable", () => {
    const schema = zodToJsonSchema({
      _def: {
        typeName: "ZodNullable",
        innerType: mockZodString(),
      },
    });
    expect(schema).toEqual({
      type: ["string", "null"],
    });
  });

  test("handles ZodDefault", () => {
    const schema = zodToJsonSchema({
      _def: {
        typeName: "ZodDefault",
        innerType: mockZodString(),
        defaultValue: () => "default_value",
      },
    });
    expect(schema).toEqual({
      type: "string",
      default: "default_value",
    });
  });

  test("handles ZodUnion", () => {
    const schema = zodToJsonSchema({
      _def: {
        typeName: "ZodUnion",
        options: [mockZodString(), mockZodNumber()],
      },
    });
    expect(schema).toEqual({
      oneOf: [{ type: "string" }, { type: "number" }],
    });
  });

  test("handles description", () => {
    const schema = zodToJsonSchema({
      _def: {
        typeName: "ZodString",
        description: "A user's email address",
        checks: [],
      },
    });
    expect(schema).toEqual({
      type: "string",
      description: "A user's email address",
    });
  });

  test("handles ZodDate", () => {
    const schema = zodToJsonSchema({
      _def: { typeName: "ZodDate" },
    });
    expect(schema).toEqual({
      type: "string",
      format: "date-time",
    });
  });

  test("returns empty object for unknown types", () => {
    const schema = zodToJsonSchema({ _def: { typeName: "UnknownType" } });
    expect(schema).toEqual({});
  });

  test("returns empty object for non-Zod values", () => {
    expect(zodToJsonSchema(null)).toEqual({});
    expect(zodToJsonSchema(undefined)).toEqual({});
    expect(zodToJsonSchema({})).toEqual({});
    expect(zodToJsonSchema("string")).toEqual({});
  });
});

describe("isZodSchema", () => {
  test("returns true for Zod-like objects", () => {
    expect(isZodSchema(mockZodString())).toBe(true);
    expect(isZodSchema(mockZodNumber())).toBe(true);
    expect(isZodSchema(mockZodObject({}))).toBe(true);
  });

  test("returns false for non-Zod values", () => {
    expect(isZodSchema(null)).toBe(false);
    expect(isZodSchema(undefined)).toBe(false);
    expect(isZodSchema({})).toBe(false);
    expect(isZodSchema({ _def: {} })).toBe(false);
    expect(isZodSchema("string")).toBe(false);
    expect(isZodSchema(123)).toBe(false);
  });
});

describe("generateOpenAPISpec", () => {
  const TEST_DIR = join(import.meta.dir, "..", "fixtures", "openapi-test");
  const APP_DIR = join(TEST_DIR, "app");

  beforeAll(async () => {
    // Create test directory structure
    await mkdir(join(APP_DIR, "api"), { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("generates valid OpenAPI 3.1 spec with empty routes", async () => {
    const spec = await generateOpenAPISpec(APP_DIR);

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Bunbox API");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.paths).toBeDefined();
  });

  test("includes custom config in spec", async () => {
    const spec = await generateOpenAPISpec(APP_DIR, {
      title: "My Custom API",
      version: "2.0.0",
      description: "A test API",
      servers: [{ url: "https://api.example.com", description: "Production" }],
    });

    expect(spec.info.title).toBe("My Custom API");
    expect(spec.info.version).toBe("2.0.0");
    expect(spec.info.description).toBe("A test API");
    expect(spec.servers?.[0]?.url).toBe("https://api.example.com");
  });
});
