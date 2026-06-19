/**
 * @file types.ts
 * @description Shared type definitions for the AI News and Research Agent.
 */

export interface ChatMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
}

export interface AgentState {
  readonly messages: readonly ChatMessage[];
  readonly stepCount: number;
  readonly requiresUserPermission: boolean;
  readonly confusionReason: string | null;
  readonly finalReportWritten: boolean;
}

export interface Session {
  readonly sessionId: string;
  readonly state: AgentState;
}

export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };
