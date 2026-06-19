/**
 * @file chatRoutes.ts
 * @description API router for the chat endpoints, managing session state and override inputs.
 */

import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";

import { runAgentGraph } from "../services/agentGraph.js";
import type { AgentState, ChatMessage } from "../types.js";

interface ChatRequestBody {
  readonly message: string;
  readonly sessionId: string;
}

// In-memory session store
 
const sessionStore = new Map<string, AgentState>();

/**
 * Checks if the user message is an override permission command.
 */
function _isOverrideCommand(msg: string): boolean {
  const norm = msg.trim().toLowerCase();
  return ["proceed", "continue", "yes", "override"].includes(norm);
}

/**
 * Handles the POST /api/chat endpoint.
 */
const handleChat: RequestHandler = (req: Request, res: Response): void => {
  const { message, sessionId } = req.body as ChatRequestBody;

  if (typeof message !== "string" || typeof sessionId !== "string") {
    res.status(400).json({ error: "Missing required fields: message and sessionId" });
    return;
  }

  const existingState = sessionStore.get(sessionId);

  const baseState: AgentState = existingState ?? {
    messages: Object.freeze([]),
    stepCount: 0,
    requiresUserPermission: false,
    confusionReason: null,
    finalReportWritten: false,
  };

  // Build the next state before running the graph using a const ternary expression
  const nextMessages: readonly ChatMessage[] = baseState.requiresUserPermission
    ? (_isOverrideCommand(message)
        ? Object.freeze([...baseState.messages, { role: "system", content: "[OVERRIDE: USER_PERMITTED]" } as const])
        : Object.freeze([...baseState.messages, { role: "user", content: message } as const]))
    : Object.freeze([...baseState.messages, { role: "user", content: message } as const]);

  const updatedState: AgentState = {
    ...baseState,
    messages: nextMessages,
    requiresUserPermission: false,
    confusionReason: null,
    // Reset step count for new execution path
    stepCount: 0,
  };

  // Run graph asynchronously
  runAgentGraph(updatedState)
    .then((result) => {
      if (result.success) {
         
        sessionStore.set(sessionId, result.value);
        res.json({
          success: true,
          state: result.value,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
      }
    })
    .catch((error: unknown) => {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

export const chatRouter: Router = Router();

 
chatRouter.post("/chat", handleChat);
