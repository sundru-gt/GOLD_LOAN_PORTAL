/**
 * Error Handling Utilities
 *
 * Standardizes all API error responses to the exact shape:
 * { "error": { "code": number, "message": string, "fields": [] } }
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/** Structured field error */
export interface FieldError {
  field: string;
  message: string;
}

/** Standard API error response */
export interface ApiErrorBody {
  error: {
    code: number;
    message: string;
    fields: FieldError[];
  };
}

/**
 * Build a structured error response body.
 */
export function buildError(
  code: number,
  message: string,
  fields: FieldError[] = []
): ApiErrorBody {
  return { error: { code, message, fields } };
}

/**
 * Convert a ZodError into the standard fields[] format.
 */
export function zodToFieldErrors(err: ZodError): FieldError[] {
  return err.errors.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));
}

/**
 * Global Express error handler middleware.
 * Catches all errors thrown in routes and returns JSON (never HTML).
 * IMPORTANT: Stack traces are stripped in production.
 */
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[ERROR]", {
    name: err.name,
    message: err.message,
    // Only log stack in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });

  // ZodErrors shouldn't reach here (handled in routes), but just in case
  if (err instanceof ZodError) {
    res.status(400).json(
      buildError(400, "Validation failed", zodToFieldErrors(err))
    );
    return;
  }

  // Generic server error – never expose internals to client
  res.status(500).json(
    buildError(500, "An unexpected error occurred", [])
  );
}

/**
 * Catch-all for unhandled async route errors.
 * Wraps async route handlers to forward errors to globalErrorHandler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
