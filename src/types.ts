export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type StateName = 'INTAKE' | 'ROUTER' | 'RESEARCH_NODE' | 'RESPOND_NODE' | 'CONFUSION_NODE';

export interface AgentState {
  sessionId: string;
  messages: Message[];
  currentState: StateName;
  requiresUserPermission: boolean;
  confusionReason?: string;
  finalReport?: string;
  targetFormat?: string;
}
