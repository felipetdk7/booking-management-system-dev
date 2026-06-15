import { Request, Response, NextFunction } from "express";
import { ValidationError, NotFoundError, ConflictError } from "../domain/errors";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: err.message,
      details: err.errors,
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: err.message,
    });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({
      error: err.message,
    });
    return;
  }

  // Log unknown server errors
  console.error("[ServerError]", err);
  res.status(500).json({
    error: "Ocurrió un error interno en el servidor.",
  });
}
