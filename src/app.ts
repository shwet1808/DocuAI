import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import chatRouter from './routes/chatRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api', chatRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Safeguards for unhandled rejections and exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
  // Gracefully close server before exiting
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
