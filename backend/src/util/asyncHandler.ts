import { RequestHandler } from "express";

// Wrap async route handlers so thrown errors reach the Express error middleware.
export const ah =
  (fn: (...args: any[]) => any): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
