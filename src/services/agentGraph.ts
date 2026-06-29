import dotenv from 'dotenv';

import { scrapeUrls } from '../tools/deepScraper.js';
import { writeReportAtomically } from '../tools/fileSystem.js';
import { searchDuckDuckGo } from '../tools/searchEngine.js';
import type { AgentState, Message, StateName } from '../types.js';

dotenv.config();

// =============================================================================
// System Prompts
// =============================================================================

const BASE_SYSTEM_PROMPT = `You are a highly resilient, autonomous AI News and Research Agent.
Your current local time/date is June 30, 2026.
Always make sure to formulate research queries containing the year '2026' or 'latest' to guarantee the most recent and up-to-date information is fetched.
Avoid using outdated context or making assumptions based on previous years.

You must follow the current state instructions and output commands when required:
- To trigger a web search, output: [TRIGGER_RESEARCH: <search query>]
- To transition to a new step in the workflow, output: [GOTO: <StateName>] followed by your response.
`;

const GATHER_SUBTOPIC_PROMPT = `${BASE_SYSTEM_PROMPT}
CURRENT TASK: We are in the 'GATHER_SUBTOPIC' step.
This agent is a fully generalized research agent that gathers authentic, up-to-date (2026) information on any topic (such as exams, career hiring, history, polity, current affairs, wars, science, or technology).
1. Check the conversation history. If the user has already asked a specific research question, named a specific subtopic, or specified exactly what they want to find, output the command:
   [SET_SUBTOPIC: <subtopic_name_or_query>]
   Do NOT output anything else.
2. If the user has only specified a very broad/vague topic (e.g. just a general category, brand, or wide field), analyze their query, provide a brief (1-2 sentences) overview/categories of the topic, and ask the user to clarify which specific subtopic or question they want to focus on.
`;

const SEARCH_SUBTOPIC_PROMPT = `${BASE_SYSTEM_PROMPT}
CURRENT TASK: We are in the 'SEARCH_SUBTOPIC' step.
The selected subtopic is: {SUBTOPIC}.
1. If the conversation does not yet contain verified source details for the timeline/process of this subtopic, you must trigger a search to gather the latest (2026) authentic information. Output:
   [TRIGGER_RESEARCH: {SUBTOPIC} process dates timeline 2026]
   Do NOT output anything else.
2. If the sources are in the history, compile and arrange the information in a structured timeline format with dates and months for 2026. Output this clearly.
3. At the end of your response, ask the user if they want to ask anything else, such as preparation details, study guides, resources, or background/prelude details.
`;

const ASK_PREPARATION_PROMPT = `${BASE_SYSTEM_PROMPT}
CURRENT TASK: We are in the 'ASK_PREPARATION' step.
The selected subtopic is: {SUBTOPIC}.
1. If the user asks for preparation materials, resources, guides, or background context, trigger a search query if needed:
   [TRIGGER_RESEARCH: {SUBTOPIC} preparation guides resources 2026]
   and compile the latest details and links.
2. If they have finished asking about preparation/resources, or did not ask for it, ask if they want any more information (specifically salary/stipend/scope for jobs, or future impact/consequences/costs for other topics). Output the GOTO command to transition:
   [GOTO: ASK_ADDITIONAL_INFO] followed by your question.
3. If they request a report instead, transition:
   [GOTO: ASK_REPORT_BLUEPRINT]
`;

const ASK_ADDITIONAL_INFO_PROMPT = `${BASE_SYSTEM_PROMPT}
CURRENT TASK: We are in the 'ASK_ADDITIONAL_INFO' step.
The selected subtopic is: {SUBTOPIC}.
1. If the user asks about salary, stipend, future scope, cost, impact, consequences, or related details, trigger search if needed:
   [TRIGGER_RESEARCH: {SUBTOPIC} salary stipend future scope cost impact consequences 2026]
   and respond with the latest authentic data.
2. If they do not want more info or have finished asking, ask them if they would like a final report. Output:
   [GOTO: ASK_REPORT_BLUEPRINT] followed by a message presenting the report option.
`;

const ASK_REPORT_BLUEPRINT_PROMPT = `${BASE_SYSTEM_PROMPT}
CURRENT TASK: We are in the 'ASK_REPORT_BLUEPRINT' step.
The selected subtopic is: {SUBTOPIC}.
1. Present a short, structured report blueprint (outline).
2. Ask the user if they want to add or remove anything from the report blueprint.
3. If the user confirms/agrees to the blueprint (e.g. says "yes", "proceed", "confirm", "looks good"), output:
   [GOTO: CONFIRM_REPORT]
   Do NOT output anything else.
`;

const CONFIRM_REPORT_PROMPT = `${BASE_SYSTEM_PROMPT}
CURRENT TASK: We are in the 'CONFIRM_REPORT' step.
The selected subtopic is: {SUBTOPIC}.
Generate the final detailed report based on all gathered info.
- The report MUST contain visual explanations like tables, ASCII graphs/charts, or flowcharts, and be arranged in a highly useful manner with headings and subtopics.
- Make sure to format dates, timeline, preparation materials, salary, stipend, and future scope in the report.
- The output of this response will be saved directly into report.txt. Do not wrap it in markdown code blocks or add chat filler. Just write the raw report content.
`;

// =============================================================================
// Helper Functions
// =============================================================================

async function callLLM(messages: Message[], systemPrompt: string): Promise<string> {
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

// =============================================================================
// State Machine Loop
// =============================================================================

export async function runGraph(state: AgentState): Promise<AgentState> {
  let loops = 0;
  const maxLoops = 10;

  while (loops < maxLoops) {
    loops++;
    console.log(`[Session: ${state.sessionId}] State: ${state.currentState} (Loop: ${loops})`);

    // ---- INTAKE ----
    if (state.currentState === 'INTAKE') {
      state.currentState = 'GATHER_SUBTOPIC';
      continue;
    }

    // ---- GATHER_SUBTOPIC ----
    else if (state.currentState === 'GATHER_SUBTOPIC') {
      try {
        const responseText = await callLLM(state.messages, GATHER_SUBTOPIC_PROMPT);
        const subtopicMatch = responseText.match(/\[set_subtopic:\s*([\S\s]+?)]/i);

        if (subtopicMatch && subtopicMatch[1]) {
          state.subtopic = subtopicMatch[1].trim();
          console.log(`[Session: ${state.sessionId}] Subtopic set to: "${state.subtopic}"`);
          state.messages.push({ role: 'assistant', content: `Focusing research on: ${state.subtopic}` });
          state.currentState = 'SEARCH_SUBTOPIC';
          continue;
        } else {
          state.messages.push({ role: 'assistant', content: responseText });
          return state;
        }
      } catch (err: any) {
        console.error('Error in GATHER_SUBTOPIC:', err);
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = err.message;
        state.requiresUserPermission = true;
        return state;
      }
    }

    // ---- SEARCH_SUBTOPIC ----
    else if (state.currentState === 'SEARCH_SUBTOPIC') {
      try {
        const prompt = SEARCH_SUBTOPIC_PROMPT.replace(/{SUBTOPIC}/g, state.subtopic || 'selected topic');
        const responseText = await callLLM(state.messages, prompt);
        const searchMatch = responseText.match(/\[trigger_research:\s*([\S\s]+?)]/i);

        if (searchMatch && searchMatch[1]) {
          const query = searchMatch[1].trim();
          state.messages.push({ role: 'assistant', content: `[TRIGGER_RESEARCH: ${query}]` });
          state.previousState = 'SEARCH_SUBTOPIC';
          state.currentState = 'RESEARCH_NODE';
          continue;
        } else {
          state.messages.push({ role: 'assistant', content: responseText });
          state.currentState = 'ASK_PREPARATION';
          return state;
        }
      } catch (err: any) {
        console.error('Error in SEARCH_SUBTOPIC:', err);
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = err.message;
        state.requiresUserPermission = true;
        return state;
      }
    }

    // ---- ASK_PREPARATION ----
    else if (state.currentState === 'ASK_PREPARATION') {
      try {
        const prompt = ASK_PREPARATION_PROMPT.replace(/{SUBTOPIC}/g, state.subtopic || 'selected topic');
        const responseText = await callLLM(state.messages, prompt);
        const gotoMatch = responseText.match(/\[goto:\s*([_a-z]+?)]/i);
        const searchMatch = responseText.match(/\[trigger_research:\s*([\S\s]+?)]/i);

        if (searchMatch && searchMatch[1]) {
          const query = searchMatch[1].trim();
          state.messages.push({ role: 'assistant', content: `[TRIGGER_RESEARCH: ${query}]` });
          state.previousState = 'ASK_PREPARATION';
          state.currentState = 'RESEARCH_NODE';
          continue;
        } else if (gotoMatch && gotoMatch[1]) {
          const nextState = gotoMatch[1].trim().toUpperCase() as StateName;
          const cleanText = responseText.replace(/\[goto:\s*([_a-z]+?)]/i, '').trim();
          if (cleanText) {
            state.messages.push({ role: 'assistant', content: cleanText });
          }
          const validStates: ReadonlyArray<StateName> = [
            'INTAKE', 'GATHER_SUBTOPIC', 'SEARCH_SUBTOPIC',
            'ASK_PREPARATION', 'ASK_ADDITIONAL_INFO',
            'ASK_REPORT_BLUEPRINT', 'CONFIRM_REPORT',
            'RESEARCH_NODE', 'CONFUSION_NODE', 'RESPOND_NODE'
          ];
          if (validStates.includes(nextState)) {
            state.currentState = nextState;
          } else {
            console.warn(`[Session: ${state.sessionId}] Invalid target state: ${nextState}. Defaulting to CONFUSION_NODE.`);
            state.currentState = 'CONFUSION_NODE';
            state.confusionReason = `Invalid transition target state: ${nextState}`;
          }
          continue;
        } else {
          state.messages.push({ role: 'assistant', content: responseText });
          return state;
        }
      } catch (err: any) {
        console.error('Error in ASK_PREPARATION:', err);
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = err.message;
        state.requiresUserPermission = true;
        return state;
      }
    }

    // ---- ASK_ADDITIONAL_INFO ----
    else if (state.currentState === 'ASK_ADDITIONAL_INFO') {
      try {
        const prompt = ASK_ADDITIONAL_INFO_PROMPT.replace(/{SUBTOPIC}/g, state.subtopic || 'selected topic');
        const responseText = await callLLM(state.messages, prompt);
        const gotoMatch = responseText.match(/\[goto:\s*([_a-z]+?)]/i);
        const searchMatch = responseText.match(/\[trigger_research:\s*([\S\s]+?)]/i);

        if (searchMatch && searchMatch[1]) {
          const query = searchMatch[1].trim();
          state.messages.push({ role: 'assistant', content: `[TRIGGER_RESEARCH: ${query}]` });
          state.previousState = 'ASK_ADDITIONAL_INFO';
          state.currentState = 'RESEARCH_NODE';
          continue;
        } else if (gotoMatch && gotoMatch[1]) {
          const nextState = gotoMatch[1].trim().toUpperCase() as StateName;
          const cleanText = responseText.replace(/\[goto:\s*([_a-z]+?)]/i, '').trim();
          if (cleanText) {
            state.messages.push({ role: 'assistant', content: cleanText });
          }
          const validStates: ReadonlyArray<StateName> = [
            'INTAKE', 'GATHER_SUBTOPIC', 'SEARCH_SUBTOPIC',
            'ASK_PREPARATION', 'ASK_ADDITIONAL_INFO',
            'ASK_REPORT_BLUEPRINT', 'CONFIRM_REPORT',
            'RESEARCH_NODE', 'CONFUSION_NODE', 'RESPOND_NODE'
          ];
          if (validStates.includes(nextState)) {
            state.currentState = nextState;
          } else {
            console.warn(`[Session: ${state.sessionId}] Invalid target state: ${nextState}. Defaulting to CONFUSION_NODE.`);
            state.currentState = 'CONFUSION_NODE';
            state.confusionReason = `Invalid transition target state: ${nextState}`;
          }
          continue;
        } else {
          state.messages.push({ role: 'assistant', content: responseText });
          return state;
        }
      } catch (err: any) {
        console.error('Error in ASK_ADDITIONAL_INFO:', err);
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = err.message;
        state.requiresUserPermission = true;
        return state;
      }
    }

    // ---- ASK_REPORT_BLUEPRINT ----
    else if (state.currentState === 'ASK_REPORT_BLUEPRINT') {
      try {
        const prompt = ASK_REPORT_BLUEPRINT_PROMPT.replace(/{SUBTOPIC}/g, state.subtopic || 'selected topic');
        const responseText = await callLLM(state.messages, prompt);
        const gotoMatch = responseText.match(/\[goto:\s*([_a-z]+?)]/i);

        if (gotoMatch && gotoMatch[1]) {
          const nextState = gotoMatch[1].trim().toUpperCase() as StateName;
          const cleanText = responseText.replace(/\[goto:\s*([_a-z]+?)]/i, '').trim();
          if (cleanText) {
            state.messages.push({ role: 'assistant', content: cleanText });
          }
          const validStates: ReadonlyArray<StateName> = [
            'INTAKE', 'GATHER_SUBTOPIC', 'SEARCH_SUBTOPIC',
            'ASK_PREPARATION', 'ASK_ADDITIONAL_INFO',
            'ASK_REPORT_BLUEPRINT', 'CONFIRM_REPORT',
            'RESEARCH_NODE', 'CONFUSION_NODE', 'RESPOND_NODE'
          ];
          if (validStates.includes(nextState)) {
            state.currentState = nextState;
          } else {
            console.warn(`[Session: ${state.sessionId}] Invalid target state: ${nextState}. Defaulting to CONFUSION_NODE.`);
            state.currentState = 'CONFUSION_NODE';
            state.confusionReason = `Invalid transition target state: ${nextState}`;
          }
          continue;
        } else {
          state.messages.push({ role: 'assistant', content: responseText });
          return state;
        }
      } catch (err: any) {
        console.error('Error in ASK_REPORT_BLUEPRINT:', err);
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = err.message;
        state.requiresUserPermission = true;
        return state;
      }
    }

    // ---- CONFIRM_REPORT ----
    else if (state.currentState === 'CONFIRM_REPORT') {
      try {
        const prompt = CONFIRM_REPORT_PROMPT.replace(/{SUBTOPIC}/g, state.subtopic || 'selected topic');
        const responseText = await callLLM(state.messages, prompt);
        state.finalReport = responseText;
        state.currentState = 'RESPOND_NODE';
        continue;
      } catch (err: any) {
        console.error('Error in CONFIRM_REPORT:', err);
        state.currentState = 'CONFUSION_NODE';
        state.confusionReason = err.message;
        state.requiresUserPermission = true;
        return state;
      }
    }

    // ---- RESEARCH_NODE ----
    else if (state.currentState === 'RESEARCH_NODE') {
      try {
        let query = '';
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const msg = state.messages[i];
          if (msg && msg.role === 'assistant') {
            const match = msg.content.match(/\[trigger_research:\s*([\S\s]+?)]/i);
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

        // Return back to the state that triggered the research
        state.currentState = state.previousState || 'GATHER_SUBTOPIC';
        state.previousState = undefined;
      } catch (err: any) {
        console.error('Error in RESEARCH_NODE state:', err);
        state.messages.push({ role: 'system', content: `Research failed: ${err.message}` });
        state.currentState = state.previousState || 'GATHER_SUBTOPIC';
        state.previousState = undefined;
      }
    }

    // ---- CONFUSION_NODE ----
    else if (state.currentState === 'CONFUSION_NODE') {
      state.requiresUserPermission = true;
      return state;
    }

    // ---- RESPOND_NODE ----
    else if (state.currentState === 'RESPOND_NODE') {
      try {
        const report = state.finalReport || '';
        console.log(`[Session: ${state.sessionId}] Writing final output to report.txt and output/report.txt...`);
        writeReportAtomically(report, './report.txt');
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
