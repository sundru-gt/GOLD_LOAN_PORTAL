/**
 * Server Entry Point
 *
 * Connects to MongoDB and starts the Express HTTP server.
 * Handles graceful shutdown on SIGTERM/SIGINT signals.
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { createApp } from "./app";
import { connectDB, disconnectDB } from "./utils/db";

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  try {
    // ── Connect to database ────────────────────────────────────────────────
    await connectDB();

    // ── Start HTTP server ──────────────────────────────────────────────────
    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`🚀 Gold Loan Portal API running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log("✅ Server closed.");
        process.exit(0);
      });

      // Force kill after 10s
      setTimeout(() => {
        console.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

main();
