import readline from 'node:readline';

import { runGraph } from './services/agentGraph.js';
import type { AgentState } from './types.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const sessionId = `cli-session-${Date.now()}`;
const OVERRIDE_COMMANDS = ['proceed', 'continue', 'yes', 'override', 'go'];

let state: AgentState = {
  sessionId,
  messages: [],
  currentState: 'INTAKE',
  requiresUserPermission: false,
};

async function promptUser() {
  const isConfusion = state.requiresUserPermission;

  let queryPrompt = '\nYou: ';
  if (isConfusion) {
    console.log(`\n⚠️  [AGENT CLARIFICATION / CONFUSION]: ${state.confusionReason}`);
    console.log(`Type one of these override commands to proceed: ${OVERRIDE_COMMANDS.join(', ')}`);
    console.log('Or type clarifying instructions to guide the agent.');
    queryPrompt = 'Override / Clarification: ';
  }

  rl.question(queryPrompt, async (input) => {
    const cleanedInput = input.trim();
    if (!cleanedInput) {
      promptUser();
      return;
    }

    if (cleanedInput.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    if (isConfusion) {
      state.requiresUserPermission = false;
      if (OVERRIDE_COMMANDS.includes(cleanedInput.toLowerCase())) {
        console.log('\n--- Permitting agent override ---');
        state.messages.push({ role: 'system', content: '[OVERRIDE: USER_PERMITTED]' });
      } else {
        console.log(`\n--- Sending clarification: "${cleanedInput}" ---`);
        state.messages.push({ role: 'user', content: cleanedInput });
      }
      // If we don't have a target format yet, go back to INTAKE to evaluate the clarification
      state.currentState = typeof state.targetFormat === 'string' ? 'ROUTER' : 'INTAKE';
    } else {
      state.messages.push({ role: 'user', content: cleanedInput });
      // If target format is already set, we can jump to ROUTER, else start at INTAKE
      state.currentState = typeof state.targetFormat === 'string' ? 'ROUTER' : 'INTAKE';
    }

    try {
      console.log('\n--- Agent Executing ---');
      state = await runGraph(state);
      console.log('--- Execution Halted ---\n');

      if (state.currentState === 'RESPOND_NODE' && state.finalReport) {
        const format = (state.targetFormat || 'markdown').toLowerCase();
        const ext = format === 'json' ? 'json' : (format === 'markdown' ? 'md' : 'txt');
        console.log(`🏆 [FINAL RESPONSE SAVED TO ./output/report.${ext}]:`);
        console.log('----------------------------------------------------');
        console.log(state.finalReport);
        console.log('----------------------------------------------------');
      }
    } catch (err: any) {
      console.error('Error running agent graph:', err);
    }

    promptUser();
  });
}

console.log('=== Welcome to the AI News & Research Agent CLI ===');
console.log('Type "exit" to close the application.\n');
promptUser();
