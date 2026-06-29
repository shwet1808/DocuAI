import dotenv from 'dotenv';

import { scrapeUrls } from '../tools/deepScraper.js';
import { writeReportAtomically } from '../tools/fileSystem.js';
import { searchDuckDuckGo } from '../tools/searchEngine.js';
import type { AgentState, Message } from '../types.js';

dotenv.config();

const INTAKE_SYSTEM_PROMPT = `You are the Intake and Scoping assistant for an AI Research Agent.
Your job is to analyze the user's initial prompt and determine two things:
1. Do you fully understand the user's specific goal, context, and requirements?
2. Is the desired output format (e.g., JSON, summary, code, markdown) specified or clear?

INSTRUCTIONS:
- If the user's request is vague, ambiguous, or lacks context such that you cannot formulate a clear research plan, or if the desired output format is not specified or clear, you MUST ask clarifying questions.
  Output the exact command:
  [CLARIFY: <your clarifying questions here>]
  Do NOT output anything else when asking for clarification.
- If the goal is clear and the desired output format is specified or can be reasonably inferred, determine the output format (e.g. JSON, summary, code, markdown, etc.) and output:
  [PROCEED: targetFormat=<format>]
  Do NOT output anything else. Examples of format: "JSON", "summary", "code", "markdown", "text".`;

const SYSTEM_PROMPT = `You are a highly resilient, autonomous AI News and Research Agent.
Your goal is to gather information, verify facts, and compile a final response on the user's query.

CRITICAL INSTRUCTIONS:
1. CHECK MEMORY FIRST: Before triggering a search, evaluate if the current conversation context/history (messages) already contains the answer. If yes, DO NOT search. Skip research and proceed directly to compilation.
2. REFUSE TO GUESS: If the context does not have the answer, and you do not have sufficient information, you must trigger research.
3. VERIFY FACTS from at least 2 independent sources.
4. Prioritize official, academic, or high-reputation news sites.
5. If you need to search the web or gather/verify facts, output the exact command:
   [TRIGGER_RESEARCH: <search query>]
   Do NOT output anything else when triggering research. You can trigger research multiple times if needed.
6. If there is a critical conflict, ambiguity, or you cannot resolve a contradiction, output the exact command:
   [CONFUSION: <reason explaining the contradiction or ambiguity>]
   Do NOT output anything else when raising confusion.
7. Output format target: {TARGET_FORMAT}
   When you have gathered enough verified information and are ready to compile the final response, output it strictly in the format: {TARGET_FORMAT}.
   - If {TARGET_FORMAT} is "markdown", use the following structure:
     # Executive Summary
     ...
     # Detailed Analysis
     ...
     # Important Statistics
     ...
     # Source Verification
     ...
     # Limitations
     ...
     # Conclusion
     ...
   - If {TARGET_FORMAT} is "JSON", output a valid, clean JSON object.
   - If {TARGET_FORMAT} is "code", output only the clean code without any conversational wrapping.
   - If {TARGET_FORMAT} is "summary", output a concise bulleted summary.
   - For other formats, format the output strictly as requested.

Always follow the instructions above. Do not guess or hallucinate.`;

async function callLLM(messages: Message[], systemPrompt: string = SYSTEM_PROMPT): Promise<string> {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const model = (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash').trim();

  if (!apiKey || apiKey === 'your_key') {
    throw new Error('Please configure a valid OPENROUTER_API_KEY in your .env file.');
  }

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.1,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/shwet1808/DocuAI',
      'X-Title': 'DocuAI',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from LLM');
  }

  return content.trim();
}

/**
 * Runs the state machine execution loop until we reach a halting state (CONFUSION_NODE or RESPOND_NODE).
 */
export async function runGraph(state: AgentState): Promise<AgentState> {
  let loops = 0;
  const maxLoops = 10; // Safeguard loop limit

  while (loops < maxLoops) {
    loops++;
    console.log(`[Session: ${state.sessionId}] State: ${state.currentState} (Loop: ${loops})`);

    if (state.currentState === 'INTAKE') {
      try {
        const responseText = await callLLM(state.messages, INTAKE_SYSTEM_PROMPT);

        const clarifyMatch = responseText.match(/\[clarify:\s*([\S\s]+?)]/i);
        const proceedMatch = responseText.match(/\[proceed:\s*targetformat=([\S\s]+?)]/i);

        if (clarifyMatch && clarifyMatch[1]) {
          const questions = clarifyMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Intake requires clarification: "${questions}"`);
          state.messages.push({ role: 'assistant', content: `[CLARIFY: ${questions}]` });
          state.confusionReason = questions;
          state.currentState = 'CONFUSION_NODE';
        } else if (proceedMatch && proceedMatch[1]) {
          const format = proceedMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Intake proceeded. Format detected: "${format}"`);
          state.targetFormat = format;
          state.currentState = 'ROUTER';
        } else {
          console.log(`[Session: ${state.sessionId}] Intake proceeded with default format.`);
          state.targetFormat = 'markdown';
          state.currentState = 'ROUTER';
        }
      } catch (err: any) {
        console.error('Error in INTAKE state:', err);
        state.messages.push({ role: 'system', content: `System error encountered: ${err.message}` });
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = `System error in LLM call during Intake: ${err.message}`;
        state.requiresUserPermission = true;
        return state;
      }
    }

    else if (state.currentState === 'ROUTER') {
      try {
        const targetFormat = state.targetFormat || 'markdown';
        const routerPrompt = SYSTEM_PROMPT.replace(/{TARGET_FORMAT}/g, targetFormat);
        const responseText = await callLLM(state.messages, routerPrompt);

        const triggerMatch = responseText.match(/\[TRIGGER_RESEARCH:\s*([\S\s]+?)]/);
        const confusionMatch = responseText.match(/\[CONFUSION:\s*([\S\s]+?)]/);

        if (triggerMatch && triggerMatch[1]) {
          const query = triggerMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Router triggered research: "${query}"`);
          state.messages.push({ role: 'assistant', content: `[TRIGGER_RESEARCH: ${query}]` });
          state.currentState = 'RESEARCH_NODE';
        } else if (confusionMatch && confusionMatch[1]) {
          const reason = confusionMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Router raised confusion: "${reason}"`);
          state.messages.push({ role: 'assistant', content: `[CONFUSION: ${reason}]` });
          state.confusionReason = reason;
          state.currentState = 'CONFUSION_NODE';
        } else {
          state.finalReport = responseText;
          state.currentState = 'RESPOND_NODE';
        }
      } catch (err: any) {
        console.error('Error in ROUTER state:', err);
        state.messages.push({ role: 'system', content: `System error encountered: ${err.message}` });
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = `System error in LLM call: ${err.message}`;
        state.requiresUserPermission = true;
        return state;
      }
    }

    else if (state.currentState === 'RESEARCH_NODE') {
      try {
        let query = '';
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const msg = state.messages[i];
          if (msg && msg.role === 'assistant') {
            const match = msg.content.match(/\[TRIGGER_RESEARCH:\s*([\S\s]+?)]/);
            if (match && match[1]) {
              query = match[1].trim();
              break;
            }
          }
        }

        if (!query) {
          throw new Error('Research node reached but no research query found in assistant history.');
        }

        console.log(`[Session: ${state.sessionId}] Executing search for: "${query}"`);
        const urls = await searchDuckDuckGo(query);
        console.log(`[Session: ${state.sessionId}] Search returned ${urls.length} URLs:`, urls);

        let scrapedText = '';
        if (urls.length > 0) {
          console.log(`[Session: ${state.sessionId}] Scraping content from URLs...`);
          const results = await scrapeUrls(urls);
          scrapedText = results.map(r => `Source URL: ${r.url}\nTitle: ${r.title}\nContent:\n${r.markdown}`).join('\n\n---\n\n');
        } else {
          scrapedText = 'No search results found.';
        }

        state.messages.push({
          role: 'system',
          content: `Here are the search and scrape results for the query "${query}":\n\n${scrapedText}\n\nVerify facts from these sources and proceed.`
        });

        state.currentState = 'ROUTER';
      } catch (err: any) {
        console.error('Error in RESEARCH_NODE state:', err);
        state.messages.push({ role: 'system', content: `Research failed: ${err.message}` });
        state.currentState = 'ROUTER';
      }
    }

    else if (state.currentState === 'CONFUSION_NODE') {
      state.requiresUserPermission = true;
      return state;
    }

    else if (state.currentState === 'RESPOND_NODE') {
      try {
        const report = state.finalReport || '';
        const format = (state.targetFormat || 'markdown').toLowerCase();
        
        let fileExtension = 'txt';
        if (format === 'json') {
          fileExtension = 'json';
        } else if (format === 'code') {
          // Defaults to js/ts or generic txt, let's write to output/report.txt or keep txt
          fileExtension = 'txt';
        } else if (format === 'markdown') {
          fileExtension = 'md';
        }

        const filePath = `./output/report.${fileExtension}`;
        console.log(`[Session: ${state.sessionId}] Writing final output (${format}) to ${filePath}...`);
        writeReportAtomically(report, filePath);
        state.requiresUserPermission = false;
        return state;
      } catch (err: any) {
        console.error('Error in RESPOND_NODE state:', err);
        state.messages.push({ role: 'system', content: `Failed to save report: ${err.message}` });
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = `Failed to save final report: ${err.message}`;
        state.requiresUserPermission = true;
        return state;
      }
    }
  }

  console.warn(`[Session: ${state.sessionId}] Execution reached loop limit without termination.`);
  return state;
}
