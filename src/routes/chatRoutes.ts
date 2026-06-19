import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { runGraph } from '../services/agentGraph.js';
import type { AgentState } from '../types.js';

const router = Router();
const sessions = new Map<string, AgentState>();

// Help match user overrides
const OVERRIDE_COMMANDS = ['proceed', 'continue', 'yes', 'override', 'go'];

router.post('/chat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
       res.status(400).json({ error: 'Message field is required.' });
       return;
    }

    const activeSessionId = sessionId || `session-${Date.now()}`;
    let state = sessions.get(activeSessionId);

    if (!state) {
      state = {
        sessionId: activeSessionId,
        messages: [],
        currentState: 'ROUTER',
        requiresUserPermission: false,
      };
      sessions.set(activeSessionId, state);
    }

    if (state.requiresUserPermission) {
      const normalizedMsg = message.trim().toLowerCase();
      if (OVERRIDE_COMMANDS.includes(normalizedMsg)) {
        console.log(`[Session: ${activeSessionId}] User override command received.`);
        state.requiresUserPermission = false;
        state.messages.push({ role: 'system', content: '[OVERRIDE: USER_PERMITTED]' });
        state.currentState = 'ROUTER';
      } else {
        console.log(`[Session: ${activeSessionId}] User clarification message received.`);
        state.requiresUserPermission = false;
        state.messages.push({ role: 'user', content: `[USER_CLARIFICATION: ${message}]` });
        state.currentState = 'ROUTER';
      }
    } else {
      state.messages.push({ role: 'user', content: message });
      state.currentState = 'ROUTER';
    }

    // Execute state machine loop
    const updatedState = await runGraph(state);

    // Save updated state back to session store
    sessions.set(activeSessionId, updatedState);

    res.json({
      sessionId: updatedState.sessionId,
      currentState: updatedState.currentState,
      requiresUserPermission: updatedState.requiresUserPermission,
      confusionReason: updatedState.confusionReason,
      finalReport: updatedState.finalReport,
      messages: updatedState.messages,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
