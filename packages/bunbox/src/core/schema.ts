/**
 * Schema validation system for Bunbox
 * Provides type-safe runtime validation for API routes
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Schema<T> {
  validate(value: unknown): ValidationResult<T>;
  optional(): Schema<T | undefined>;
}

class BaseSchema<T> implements Schema<T> {
  constructor(private validator: (value: unknown) => ValidationResult<T>) {}

  validate(value: unknown): ValidationResult<T> {
    return this.validator(value);
  }

  optional(): Schema<T | undefined> {
    return new BaseSchema((value: unknown) => {
      if (value === undefined || value === null) {
        return { success: true, data: undefined };
      }
      return this.validator(value);
    });
  }
}

/**
 * Helper to check range constraints
 */
function checkRange(
  value: number,
  min: number | undefined,
  max: number | undefined,
  unit: string
): string | null {
  if (min !== undefined && value < min) {
    return `${unit} must be at least ${min}`;
  }
  if (max !== undefined && value > max) {
    return `${unit} must be at most ${max}`;
  }
  return null;
}

class StringSchema extends BaseSchema<string> {
  private minLength?: number;
  private maxLength?: number;

  constructor() {
    super((value: unknown) => {
      if (typeof value !== "string") {
        return { success: false, error: "Expected string" };
      }
      const error = checkRange(
        value.length,
        this.minLength,
        this.maxLength,
        "String"
      );
      return error ? { success: false, error } : { success: true, data: value };
    });
  }

  min(length: number): this {
    this.minLength = length;
    return this;
  }

  max(length: number): this {
    this.maxLength = length;
    return this;
  }

  email(): Schema<string> {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return new BaseSchema((value: unknown) => {
      const result = this.validate(value);
      if (!result.success) return result;
      if (!emailPattern.test(result.data!)) {
        return { success: false, error: "Invalid email format" };
      }
      return result;
    });
  }
}

class NumberSchema extends BaseSchema<number> {
  private minValue?: number;
  private maxValue?: number;

  constructor() {
    super((value: unknown) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (typeof num !== "number" || isNaN(num)) {
        return { success: false, error: "Expected number" };
      }
      const error = checkRange(num, this.minValue, this.maxValue, "Number");
      return error ? { success: false, error } : { success: true, data: num };
    });
  }

  min(value: number): this {
    this.minValue = value;
    return this;
  }

  max(value: number): this {
    this.maxValue = value;
    return this;
  }
}

type SchemaObject = Record<string, Schema<any>>;
type InferSchemaType<T extends SchemaObject> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
};

class ObjectSchema<T extends SchemaObject> extends BaseSchema<
  InferSchemaType<T>
> {
  constructor(private shape: T) {
    super((value: unknown) => this.validateObject(value));
  }

  private validateObject(value: unknown): ValidationResult<InferSchemaType<T>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { success: false, error: "Expected object" };
    }

    const result = {} as InferSchemaType<T>;
    const errors: string[] = [];

    for (const [key, fieldSchema] of Object.entries(this.shape)) {
      const fieldResult = fieldSchema.validate((value as any)[key]);
      if (fieldResult.success) {
        result[key as keyof InferSchemaType<T>] = fieldResult.data!;
      } else {
        errors.push(`${key}: ${fieldResult.error}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join(", ") };
    }

    return { success: true, data: result };
  }
}

class ArraySchema<T> extends BaseSchema<T[]> {
  private minItems?: number;
  private maxItems?: number;

  constructor(private itemSchema: Schema<T>) {
    super((value: unknown) => this.validateArray(value));
  }

  private validateArray(value: unknown): ValidationResult<T[]> {
    if (!Array.isArray(value)) {
      return { success: false, error: "Expected array" };
    }

    if (this.minItems !== undefined && value.length < this.minItems) {
      return {
        success: false,
        error: `Array must have at least ${this.minItems} items`,
      };
    }

    if (this.maxItems !== undefined && value.length > this.maxItems) {
      return {
        success: false,
        error: `Array must have at most ${this.maxItems} items`,
      };
    }

    const result: T[] = [];
    const errors: string[] = [];

    for (let i = 0; i < value.length; i++) {
      const itemResult = this.itemSchema.validate(value[i]);
      if (itemResult.success) {
        result.push(itemResult.data!);
      } else {
        errors.push(`[${i}]: ${itemResult.error}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join(", ") };
    }

    return { success: true, data: result };
  }

  min(items: number): this {
    this.minItems = items;
    return this;
  }

  max(items: number): this {
    this.maxItems = items;
    return this;
  }
}

/**
 * Schema builder utilities
 */
export const schema = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () =>
    new BaseSchema<boolean>((value: unknown) => {
      if (typeof value === "boolean") {
        return { success: true, data: value };
      }
      if (value === "true" || value === "false") {
        return { success: true, data: value === "true" };
      }
      return { success: false, error: "Expected boolean" };
    }),
  object: <T extends SchemaObject>(shape: T) => new ObjectSchema(shape),
  array: <T>(itemSchema: Schema<T>) => new ArraySchema(itemSchema),
};

// Type inference helper
export type Infer<T> = T extends Schema<infer U> ? U : never;
