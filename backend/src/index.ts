/**
 * index.ts – server entry point
 */
import app from "./app";
import { config } from "./config";
import { connectDB, disconnectDB } from "./db/mongoose";

async function start() {
  // Connect to MongoDB before accepting HTTP traffic
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║        VM Management Backend – started               ║
╠══════════════════════════════════════════════════════╣
║  Server   : http://localhost:${config.port}                 ║
║  Prometheus: ${config.prometheusUrl}  ║
║  ENV      : ${config.nodeEnv.padEnd(14)}                    ║
╚══════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received – shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("[FATAL] Failed to start server:", err);
  process.exit(1);
});
