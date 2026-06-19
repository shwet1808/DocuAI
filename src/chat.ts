/**
 * @file chat.ts
 * @description Interactive readline CLI chat interface for the Research Agent.
 */

import readline from "node:readline";

import dotenv from "dotenv";

import { runAgentGraph } from "./services/agentGraph.js";
import type { AgentState, ChatMessage } from "./types.js";

// Load configuration
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Wraps rl.question in a Promise.
 */
function _askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Checks if a message is an override permission.
 */
function _isOverrideCommand(msg: string): boolean {
  const norm = msg.trim().toLowerCase();
  return ["proceed", "continue", "yes", "override"].includes(norm);
}

/**
 * Interactive recursive CLI execution loop.
 */
async function _cliLoop(state: AgentState): Promise<void> {
  const answer = await _askQuestion("\nYou: ");
  if (answer.trim().toLowerCase() === "exit") {
    rl.close();
    return;
  }

  const nextMessages: readonly ChatMessage[] = state.requiresUserPermission
    ? (_isOverrideCommand(answer)
        ? Object.freeze([...state.messages, { role: "system", content: "[OVERRIDE: USER_PERMITTED]" } as const])
        : Object.freeze([...state.messages, { role: "user", content: answer } as const]))
    : Object.freeze([...state.messages, { role: "user", content: answer } as const]);

  const updatedState: AgentState = {
    ...state,
    messages: nextMessages,
    requiresUserPermission: false,
    confusionReason: null,
    stepCount: 0,
  };

  console.log("\nAgent is thinking...");
  const result = await runAgentGraph(updatedState);

  if (result.success) {
    const finalState = result.value;
    const lastMsg = finalState.messages[finalState.messages.length - 1];
    if (typeof lastMsg !== "undefined") {
      console.log(`\nAgent: ${lastMsg.content}`);
    }

    if (finalState.requiresUserPermission && finalState.confusionReason !== null) {
      console.log(`\n[CONFUSION REQUIREMENT]: ${finalState.confusionReason}`);
      console.log("Type 'yes' or 'proceed' to approve the override, or provide clarification.");
    }

    if (finalState.finalReportWritten) {
      console.log("\n[SUCCESS] Final report has been written atomically to `./output/report.txt`.");
    }

    return _cliLoop(finalState);
  } else {
    console.error(`\nError: ${result.error.message}`);
    return _cliLoop(state);
  }
}

/**
 * Starts the CLI interface.
 */
function startCli(): void {
  console.log("======================================================================");
  console.log("Welcome to DocuAI News and Research Agent Console");
  console.log("Type your query to start researching. Type 'exit' to quit.");
  console.log("======================================================================");

  const initialState: AgentState = {
    messages: Object.freeze([]),
    stepCount: 0,
    requiresUserPermission: false,
    confusionReason: null,
    finalReportWritten: false,
  };

  _cliLoop(initialState).catch((err: unknown) => {
    console.error("Fatal CLI Error:", err);
    rl.close();
  });
}

startCli();
