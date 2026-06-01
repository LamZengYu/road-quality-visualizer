import { Request, Response, NextFunction } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({
    error: { code: err.code ?? "INTERNAL", message: err.message ?? "Server error" },
  });
}
