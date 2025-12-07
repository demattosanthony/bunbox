/**
 * Structured error handling for Bunbox API routes
 * Based on RFC 7807 Problem Details for HTTP APIs
 */

/**
 * RFC 7807 Problem Details structure
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type */
  type: string;
  /** Short human-readable summary of the problem */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation specific to this occurrence */
  detail?: string;
  /** URI reference for the specific occurrence */
  instance?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Field-level validation error
 */
export interface FieldError {
  /** Path to the field (e.g., "body.email", "query.page") */
  field: string;
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Expected value or type (optional) */
  expected?: string;
  /** Received value or type (optional) */
  received?: string;
}

/**
 * Validation error with field-level details
 */
export interface ValidationProblemDetails extends ProblemDetails {
  type: "https://bunbox.dev/errors/validation";
  /** Array of field-level errors */
  errors: FieldError[];
}

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Convert to RFC 7807 Problem Details format
   */
  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: `https://bunbox.dev/errors/${this.code}`,
      title: this.code
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      status: this.status,
      detail: this.message,
      instance,
      ...this.details,
    };
  }

  /**
   * Convert to JSON Response
   */
  toResponse(): Response {
    const body = this.toProblemDetails();
    return new Response(JSON.stringify(body), {
      status: this.status,
      headers: {
        "Content-Type": "application/problem+json",
      },
    });
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends ApiError {
  constructor(public readonly fieldErrors: FieldError[]) {
    super(400, "validation_error", "Request validation failed");
    this.name = "ValidationError";
  }

  override toProblemDetails(instance?: string): ValidationProblemDetails {
    return {
      type: "https://bunbox.dev/errors/validation",
      title: "Validation Error",
      status: this.status,
      detail: this.message,
      instance,
      errors: this.fieldErrors,
    };
  }
}

/**
 * Error factory with common HTTP error types
 */
export const errors = {
  /**
   * 400 Bad Request - Generic client error
   */
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new ApiError(400, "bad_request", message, details),

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message = "Authentication required") =>
    new ApiError(401, "unauthorized", message),

  /**
   * 403 Forbidden - Access denied
   */
  forbidden: (message = "Access denied") =>
    new ApiError(403, "forbidden", message),

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (resource = "Resource") =>
    new ApiError(404, "not_found", `${resource} not found`),

  /**
   * 409 Conflict - Resource conflict
   */
  conflict: (message: string) => new ApiError(409, "conflict", message),

  /**
   * 422 Unprocessable Entity - Semantic validation error
   */
  unprocessable: (message: string, details?: Record<string, unknown>) =>
    new ApiError(422, "unprocessable_entity", message, details),

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  rateLimit: (message = "Too many requests", retryAfter?: number) =>
    new ApiError(429, "rate_limit_exceeded", message, { retryAfter }),

  /**
   * 500 Internal Server Error
   */
  internal: (message = "Internal server error") =>
    new ApiError(500, "internal_error", message),

  /**
   * 503 Service Unavailable
   */
  unavailable: (message = "Service temporarily unavailable") =>
    new ApiError(503, "service_unavailable", message),

  /**
   * Validation error with field-level details
   */
  validation: (fieldErrors: FieldError[]) => new ValidationError(fieldErrors),
};

/**
 * Create a Problem Details response from any error
 */
export function problemResponse(
  error: string | ApiError | ProblemDetails,
  status = 400
): Response {
  let body: ProblemDetails;

  if (typeof error === "string") {
    body = {
      type: "https://bunbox.dev/errors/generic",
      title: "Error",
      status,
      detail: error,
    };
  } else if (error instanceof ApiError) {
    body = error.toProblemDetails();
  } else {
    body = error;
  }

  return new Response(JSON.stringify(body), {
    status: body.status,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
}
