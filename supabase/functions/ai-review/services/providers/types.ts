export interface ChatCompletionParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  chatCompletion(params: ChatCompletionParams): Promise<string>;
}
