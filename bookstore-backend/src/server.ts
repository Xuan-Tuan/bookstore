import dotenv from "dotenv";
import { Server } from "http";
import app from "./app";
import prisma from "./config/db";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost";
const NODE_ENV = process.env.NODE_ENV || "development";

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}

let server: Server | null = null;

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📢 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Đóng HTTP server
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      console.log("✅ HTTP server closed.");
    }

    // Đóng kết nối database
    await prisma.$disconnect();
    console.log("✅ Database connection closed.");

    console.log("👋 Graceful shutdown completed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle unexpected errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    console.log("🔗 Testing database connection...");

    // Test DB connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    server = app.listen(PORT, () => {
      console.log(`
🚀 Server is running!
📍 Environment: ${NODE_ENV}
📍 URL: http://${HOST}:${PORT}
📍 Health check: http://${HOST}:${PORT}/health
📍 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}
⏰ Started at: ${new Date().toISOString()}
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);

    if (
      error instanceof Error &&
      error.message.includes("connect ECONNREFUSED")
    ) {
      console.error("💡 Check if MySQL is running on localhost:3306");
      console.error("💡 Run: sudo service mysql start hoặc mysql.server start");
    }

    process.exit(1);
  }
};

// Run server
startServer();

export default server;
