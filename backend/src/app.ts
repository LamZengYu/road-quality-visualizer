import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import mapRoutes from "./routes/maps.routes";
import pathRoutes from "./routes/paths.routes";
import ingestRoutes from "./routes/ingest.routes";
import { notFound, errorHandler } from "./middleware/error.middleware";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/maps", mapRoutes);
  app.use("/api/paths", pathRoutes);
  app.use("/api/ingest", ingestRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
