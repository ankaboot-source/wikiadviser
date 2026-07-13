import { LLMConfig } from "./types.ts";

const AI_MODEL = Deno.env.get("AI_MODEL");
export function isFreeModel(model: string): boolean {
  if (!model) return false;
  if (model === AI_MODEL) return true;
  return model.endsWith(":free");
}

export function assertFreeModelAllowed(config: LLMConfig): void {
  if (!config.hasUserConfig && !isFreeModel(config.model)) {
    throw new Error(
      "Global API key may only be used with free OpenRouter models",
    );
  }
}
