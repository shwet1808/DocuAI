import dotenv from 'dotenv';

import { scrapeUrls } from '../tools/deepScraper.js';
import { writeReportAtomically } from '../tools/fileSystem.js';
import { searchDuckDuckGo } from '../tools/searchEngine.js';
import type { AgentState, Message } from '../types.js';

dotenv.config();


const SYSTEM_PROMPT = `You are a highly resilient, autonomous AI News and Research Agent.
Your goal is to gather information, verify facts, and compile a report on the user's query.

CRITICAL INSTRUCTIONS:
1. REFUSE TO GUESS. If you do not have sufficient information, you must trigger research.
2. VERIFY FACTS from at least 2 independent sources.
3. Prioritize official, academic, or high-reputation news sites.
4. If you need to search the web or gather/verify facts, output the exact command:
   [TRIGGER_RESEARCH: <search query>]
   Do NOT output anything else when triggering research. You can trigger research multiple times if needed.
5. If there is a critical conflict, ambiguity, or you cannot resolve a contradiction, output the exact command:
   [CONFUSION: <reason explaining the contradiction or ambiguity>]
   Do NOT output anything else when raising confusion.
6. When you have gathered enough verified information and are ready to compile the final report, output the report.
   The final report MUST use the following structure:
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

Always follow the instructions above. Do not guess or hallucinate.`;

async function callLLM(messages: Message[]): Promise<string> {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const model = (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash').trim();

  if (!apiKey || apiKey === 'your_key') {
    throw new Error('Please configure a valid OPENROUTER_API_KEY in your .env file.');
  }

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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

    if (state.currentState === 'ROUTER') {
      try {
        const responseText = await callLLM(state.messages);

        const triggerMatch = responseText.match(/\[TRIGGER_RESEARCH:\s*([\S\s]+?)]/);
        const confusionMatch = responseText.match(/\[CONFUSION:\s*([\S\s]+?)]/);

        if (triggerMatch && triggerMatch[1]) {
          const query = triggerMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Router triggered research: "${query}"`);
          state.messages.push({ role: 'assistant', content: `[TRIGGER_RESEARCH: ${query}]` });
          // Store research query in temporary context if needed, but we can transition directly
          state.currentState = 'RESEARCH_NODE';
        } else if (confusionMatch && confusionMatch[1]) {
          const reason = confusionMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Router raised confusion: "${reason}"`);
          state.messages.push({ role: 'assistant', content: `[CONFUSION: ${reason}]` });
          state.confusionReason = reason;
          state.currentState = 'CONFUSION_NODE';
        } else {
          // No instruction match means we have the final report
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
        // Find the last trigger research query from assistant messages
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

        // Save findings as a system message in the message list
        state.messages.push({
          role: 'system',
          content: `Here are the search and scrape results for the query "${query}":\n\n${scrapedText}\n\nVerify facts from these sources and proceed.`
        });

        // Transition back to ROUTER to decide next step
        state.currentState = 'ROUTER';
      } catch (err: any) {
        console.error('Error in RESEARCH_NODE state:', err);
        state.messages.push({ role: 'system', content: `Research failed: ${err.message}` });
        state.currentState = 'ROUTER';
      }
    }

    else if (state.currentState === 'CONFUSION_NODE') {
      state.requiresUserPermission = true;
      // Halt operations until the client triggers execution again (clarification/override)
      return state;
    }

    else if (state.currentState === 'RESPOND_NODE') {
      try {
        const report = state.finalReport || '';
        console.log(`[Session: ${state.sessionId}] Writing final report to output/report.txt...`);
        writeReportAtomically(report, './output/report.txt');
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
