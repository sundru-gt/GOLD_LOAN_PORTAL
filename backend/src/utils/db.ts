/**
 * Database connection utility.
 * Handles connect, disconnect, and connection events.
 */

import mongoose from "mongoose";

let isConnected = false;

/**
 * Connect to MongoDB. Idempotent – won't open multiple connections.
 */
export async function connectDB(uri?: string): Promise<void> {
  if (isConnected) return;

  const mongoUri =
    uri || process.env.MONGODB_URI || "mongodb://localhost:27017/gold_loan_portal";

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected");
    isConnected = true;
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err.message);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.log("🔌 MongoDB disconnected");
    isConnected = false;
  });

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
}

/**
 * Gracefully disconnect from MongoDB.
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
