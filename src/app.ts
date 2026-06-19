/**
 * @file app.ts
 * @description Main entry point for the Express API Server.
 */

import dotenv from "dotenv";
import express from "express";

import { chatRouter } from "./routes/chatRoutes.js";

// Load configuration
dotenv.config();

const app = express();

// Middleware to parse JSON bodies
 
app.use(express.json());

// Routes
 
app.use("/api", chatRouter);

// Safeguards: Unhandled exception and rejection handlers
process.on("uncaughtException", (error: Error): void => {
  console.error("Uncaught Exception caught:", error.message);
});

process.on("unhandledRejection", (reason: unknown): void => {
  console.error("Unhandled Rejection caught:", String(reason));
});

// Start the server
const port = process.env.PORT ?? "3000";
 
app.listen(port, (): void => {
  console.log(`Express API Server running on port ${port}`);
});
