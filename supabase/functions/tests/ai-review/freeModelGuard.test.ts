import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { LLMConfig } from "../../ai-review/utils/types.ts";
import { assertFreeModelAllowed } from "../../ai-review/utils/freeModelGuard.ts";

function makeConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    apiKey: "sk-test",
    prompt: "prompt",
    model: "openai/gpt-oss-20b:free",
    hasUserConfig: false,
    provider: "openrouter",
    endpoint: null,
    ...overrides,
  };
}

Deno.test(
  "assertFreeModelAllowed: OpenRouter + global key + :free model passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      model: "deepseek/deepseek-r1:free",
    });
    assertEquals(assertFreeModelAllowed(config), undefined);
  },
);

Deno.test(
  "assertFreeModelAllowed: OpenRouter + global key + openrouter/free router passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      model: "openrouter/free",
    });
    assertEquals(assertFreeModelAllowed(config), undefined);
  },
);

Deno.test(
  "assertFreeModelAllowed: OpenRouter + global key + paid model throws",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      model: "openai/gpt-4o",
    });
    assertThrows(() => assertFreeModelAllowed(config), Error, "Global API key");
  },
);

Deno.test(
  "assertFreeModelAllowed: OpenRouter + personal key + paid model passes",
  () => {
    const config = makeConfig({
      hasUserConfig: true,
      model: "openai/gpt-4o",
    });
    assertEquals(assertFreeModelAllowed(config), undefined);
  },
);

Deno.test(
  "assertFreeModelAllowed: non-OpenRouter provider + global key passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      provider: "openai",
      model: "gpt-4o",
    });
    assertEquals(assertFreeModelAllowed(config), undefined);
  },
);

Deno.test(
  "assertFreeModelAllowed: OpenRouter + global key + custom provider endpoint passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      provider: "custom",
      model: "whatever",
      endpoint: "https://example.com/v1",
    });
    assertEquals(assertFreeModelAllowed(config), undefined);
  },
);
