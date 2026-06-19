/**
 * @file agentGraph.ts
 * @description State machine engine running the router, research, respond, and confusion loop.
 */

import { scrapeUrls } from "../tools/deepScraper.js";
import { writeAtomically } from "../tools/fileSystem.js";
import { searchDuckDuckGo } from "../tools/searchEngine.js";
import type { AgentState, ChatMessage, Result } from "../types.js";

const SYSTEM_PROMPT = `You are a highly resilient, autonomous AI News and Research Agent.
Your goal is to gather information, verify facts from at least 2 independent sources, prioritize official/academic sites, prevent AI hallucinations, and refuse to guess.

If you need to search the web for information to verify facts or answer a question, you MUST output:
[TRIGGER_RESEARCH: <search query>]
Do not output anything else when triggering research.

If you encounter conflicting information, ambiguous topics, or if you cannot verify facts sufficiently and need user clarification/permission to proceed, you MUST output:
[CONFUSION: <reason why you are confused or need permission>]

If you have all the information required, formulate your final report strictly using the following structure:
# Executive Summary
<summary>

# Detailed Analysis
<analysis>

# Important Statistics
<key stats>

# Source Verification
<list of sources and what was verified>

# Limitations
<any limitations or gaps>

# Conclusion
<conclusion>

Always maintain high objectivity. Do not write placeholders or guess.`;

const MAX_STEPS = 10;

/**
 * Runs the state machine execution loop recursively to transition between states.
 * 
 * @param state The initial agent state.
 * @returns A promise resolving to the final updated agent state or an error.
 */
export async function runAgentGraph(state: AgentState): Promise<Result<AgentState>> {
  return _runStep(state);
}

/**
 * Calls OpenRouter chat completions API to get the model's response.
 */
async function _callLlm(messages: readonly ChatMessage[]): Promise<Result<string>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    return { success: false, error: new Error("OPENROUTER_API_KEY environment variable is not set or empty.") };
  }

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  // eslint-disable-next-line functional/no-try-statements
  try {
    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/shwet1808/DocuAI",
        "X-Title": "DocuAI Research Agent",
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: new Error(`OpenRouter API error: ${String(response.status)} - ${text}`) };
    }

    const data = (await response.json()) as {
      readonly choices?: readonly { readonly message?: { readonly content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { success: false, error: new Error("Empty or invalid choice response structure from OpenRouter API.") };
    }

    return { success: true, value: content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * The Router node that evaluates messages and decides the next action.
 */
async function _routerNode(state: AgentState): Promise<Result<AgentState>> {
  const llmRes = await _callLlm(state.messages);
  if (!llmRes.success) return llmRes;
  const content = llmRes.value;

  const triggerMatch = /\[trigger_research:\s*(.*?)]/i.exec(content);
  const confusionMatch = /\[confusion:\s*(.*?)]/i.exec(content);

  if (triggerMatch !== null && typeof triggerMatch[1] === "string") {
    const query = triggerMatch[1].trim();
    return _researchNode(state, query);
  }

  if (confusionMatch !== null && typeof confusionMatch[1] === "string") {
    const reason = confusionMatch[1].trim();
    return _confusionNode(state, reason);
  }

  return _respondNode(state, content);
}

/**
 * The Research node that performs search and scraping, and logs the findings.
 */
async function _researchNode(state: AgentState, query: string): Promise<Result<AgentState>> {
  const searchRes = await searchDuckDuckGo(query);
  if (!searchRes.success) return searchRes;
  
  const scrapeRes = await scrapeUrls(searchRes.value);
  if (!scrapeRes.success) return scrapeRes;

  const systemMessage: ChatMessage = {
    role: "system",
    content: `Research findings for query: "${query}"\n\n${scrapeRes.value}`,
  };

  const nextState: AgentState = {
    ...state,
    messages: Object.freeze([...state.messages, systemMessage]),
    stepCount: state.stepCount + 1,
  };

  return { success: true, value: nextState };
}

/**
 * The Confusion node that prompts for user permission.
 */
function _confusionNode(state: AgentState, reason: string): Promise<Result<AgentState>> {
  const nextState: AgentState = {
    ...state,
    requiresUserPermission: true,
    confusionReason: reason,
    stepCount: state.stepCount + 1,
  };
  return Promise.resolve({ success: true, value: nextState });
}

/**
 * The Respond node that writes the final report atomically.
 */
async function _respondNode(state: AgentState, reportContent: string): Promise<Result<AgentState>> {
  const writeRes = await writeAtomically(reportContent);
  if (!writeRes.success) return writeRes;

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: reportContent,
  };

  const nextState: AgentState = {
    ...state,
    messages: Object.freeze([...state.messages, assistantMessage]),
    finalReportWritten: true,
    stepCount: state.stepCount + 1,
  };

  return { success: true, value: nextState };
}

/**
 * The recursive execution runner.
 */
async function _runStep(currentState: AgentState): Promise<Result<AgentState>> {
  if (currentState.stepCount >= MAX_STEPS) {
    return { success: true, value: currentState };
  }

  const result = await _routerNode(currentState);
  if (!result.success) return result;

  const nextState = result.value;

  if (nextState.requiresUserPermission || nextState.finalReportWritten) {
    return { success: true, value: nextState };
  }

  return _runStep(nextState);
}
