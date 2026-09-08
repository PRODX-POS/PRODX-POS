export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIChatRequest {
  model?: string;
  messages: readonly AIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface AIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AIChatResponse {
  id?: string;
  model?: string;
  choices?: readonly unknown[];
  usage?: AIUsage;
  provider?: string;
  raw: unknown;
}

export interface AIProvider {
  readonly name: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
}
