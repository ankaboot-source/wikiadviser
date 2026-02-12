export interface DiffChange {
  type: 'insert' | 'delete' | 'change';
  oldText: string;
  newText: string;
  context?: string;
}

export interface ReviewResult {
  index: number;
  comment: string;
  proposed_change: string;
  has_improvement: boolean;
  change_type: 'insert' | 'delete' | 'change';
  is_fallback?: boolean;
}

export interface AIResponse {
  change_index: number;
  has_changes: boolean;
  comment: string;
  proposed_change: string;
}

export interface LLMConfig {
  apiKey: string;
  prompt: string;
  model: string;
  hasUserConfig: boolean;
}

export interface BatchResult {
  success: boolean;
  responses: AIResponse[];
  error?: string;
  isFallback?: boolean;
  rawContent?: string;
}

export interface ParsedResponse {
  type: 'json' | 'text';
  responses?: AIResponse[];
  rawText?: string;
}
