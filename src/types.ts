export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type StateName =
  | 'INTAKE'
  | 'GATHER_SUBTOPIC'
  | 'SEARCH_SUBTOPIC'
  | 'ASK_PREPARATION'
  | 'ASK_ADDITIONAL_INFO'
  | 'ASK_REPORT_BLUEPRINT'
  | 'CONFIRM_REPORT'
  | 'RESEARCH_NODE'
  | 'CONFUSION_NODE'
  | 'RESPOND_NODE';

export interface AgentState {
  sessionId: string;
  messages: Message[];
  currentState: StateName;
  requiresUserPermission: boolean;
  confusionReason?: string;
  finalReport?: string;
  targetFormat?: string;
  subtopic?: string;
  blueprintConfirmed?: boolean;
  previousState?: StateName;
}
