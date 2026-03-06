/**
 * db/mongoose.ts
 *
 * Connects to MongoDB using mongoose. Call connectDB() once at server startup.
 */
import mongoose from "mongoose";
import { config } from "../config";

export async function connectDB(): Promise<void> {
  if (!config.mongoUrl) {
    throw new Error("MONGO_URL is not set in the environment variables.");
  }

  mongoose.connection.on("connected", () =>
    console.log("[MongoDB] Connected successfully"),
  );
  mongoose.connection.on("error", (err) =>
    console.error("[MongoDB] Connection error:", err),
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("[MongoDB] Disconnected"),
  );

  await mongoose.connect(config.mongoUrl, {
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("[MongoDB] Disconnected gracefully");
}
