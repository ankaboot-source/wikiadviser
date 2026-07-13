import {
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { LLMConfig } from "../../ai-review/utils/types.ts";
import { assertFreeModelAllowed } from "../../ai-review/utils/freeModelGuard.ts";

Deno.env.set("AI_MODEL", "openrouter/free");

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
  "assertFreeModelAllowed: global key + :free model passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      model: "deepseek/deepseek-r1:free",
    });
    assertFreeModelAllowed(config);
  },
);

Deno.test(
  "assertFreeModelAllowed: global key + AI_MODEL env default passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      model: "openrouter/free",
    });
    assertFreeModelAllowed(config);
  },
);

Deno.test(
  "assertFreeModelAllowed: global key + paid model throws",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      model: "openai/gpt-4o",
    });
    assertThrows(() => assertFreeModelAllowed(config), Error, "Global API key");
  },
);

Deno.test(
  "assertFreeModelAllowed: personal key + paid model passes",
  () => {
    const config = makeConfig({
      hasUserConfig: true,
      model: "openai/gpt-4o",
    });
    assertFreeModelAllowed(config);
  },
);

Deno.test(
  "assertFreeModelAllowed: global key + free model + custom provider passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      provider: "custom",
      model: "some-model:free",
      endpoint: "https://example.com/v1",
    });
    assertFreeModelAllowed(config);
  },
);

Deno.test(
  "assertFreeModelAllowed: global key + free model + non-openrouter provider passes",
  () => {
    const config = makeConfig({
      hasUserConfig: false,
      provider: "openai",
      model: "gpt-4o:free",
    });
    assertFreeModelAllowed(config);
  },
);
