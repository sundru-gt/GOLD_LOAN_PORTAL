/**
 * Express Application Setup
 *
 * Configures middleware, routes, and error handlers.
 * Separated from server.ts to enable clean testing (no side effects).
 */

import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import loanSchemesRouter from "./routes/loanSchemes";
import quotesRouter from "./routes/quotes";
import leadsRouter from "./routes/leads";
import agentRouter from "./routes/agent";
import { globalErrorHandler } from "./utils/errorUtils";

dotenv.config({ path: "../.env" });

export function createApp(): Application {
  const app = express();

  // ─── Security & Parsing Middleware ──────────────────────────────────────
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Request Logger (dev only) ──────────────────────────────────────────
  if (process.env.NODE_ENV !== "test") {
    app.use((req: Request, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // ─── Health Check ────────────────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "gold-loan-portal-api",
    });
  });

  // ─── API Routes ─────────────────────────────────────────────────────────
  app.use("/api/v1/loan-schemes", loanSchemesRouter);
  app.use("/api/v1/quotes", quotesRouter);
  app.use("/api/v1/leads", leadsRouter);
  app.use("/api/v1/agent", agentRouter);

  // ─── 404 Handler ────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 404,
        message: "Route not found",
        fields: [],
      },
    });
  });

  // ─── Global Error Handler ───────────────────────────────────────────────
  app.use(globalErrorHandler);

  return app;
}
