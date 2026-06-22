# Changeable AI Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to choose their AI provider (OpenAI, Anthropic, Gemini, OpenRouter, Custom) instead of being hardcoded to OpenRouter.

**Architecture:** Provider adapter pattern — each provider implements a common `AIProvider` interface. A factory routes to the correct adapter based on user config stored in `llm_reviewer_config` JSONB column. Frontend provides provider selector with conditional model input.

**Tech Stack:** Deno/TypeScript (Supabase Edge Functions), Vue 3/Quasar (Frontend), Supabase Vault (API keys)

---

### Task 1: Database Migration — Add provider + endpoint fields

**Files:**
- Create: `supabase/migrations/20260610000000_add_provider_to_llm_config.sql`
- Modify: `frontend/src/types/index.ts` (Profile.llm_reviewer_config)

**Step 1: Write migration SQL**

Create migration that adds `provider` and `endpoint` keys to `llm_reviewer_config`:

```sql
UPDATE profiles
SET llm_reviewer_config =
  CASE
    WHEN llm_reviewer_config IS NULL THEN
      '{"provider": "openrouter", "endpoint": null}'::jsonb
    ELSE
      llm_reviewer_config || '{"provider": "openrouter", "endpoint": null}'::jsonb
  END
WHERE llm_reviewer_config IS NULL
   OR NOT llm_reviewer_config ? 'provider';
```

**Step 2: Update Profile type in `frontend/src/types/index.ts`**

Add `provider?: string;` and `endpoint?: string | null;` to the `llm_reviewer_config` type.

**Step 3: Commit**

```bash
git add supabase/migrations/20260610000000_add_provider_to_llm_config.sql frontend/src/types/index.ts
git commit -m "feat: add provider and endpoint fields to llm_reviewer_config"
```

---

### Task 2: Backend — Create provider adapter interface + OpenAI-compatible adapter

**Files:**
- Create: `supabase/functions/ai-review/services/providers/types.ts`
- Create: `supabase/functions/ai-review/services/providers/openai-compatible.ts`
- Modify: `supabase/functions/ai-review/utils/types.ts` (update LLMConfig)

**Step 1: Create `providers/types.ts`**

```ts
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
```

**Step 2: Update `utils/types.ts`** — add `provider: string;` and `endpoint?: string | null;` to `LLMConfig`.

**Step 3: Create `providers/openai-compatible.ts`**

```ts
import { AIProvider, ChatCompletionParams } from './types.ts';

export class OpenAICompatibleProvider implements AIProvider {
  constructor(private baseUrl: string) {}

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');
    return content.trim();
  }
}
```

**Step 4: Commit**

```bash
git add supabase/functions/ai-review/services/providers/ supabase/functions/ai-review/utils/types.ts
git commit -m "feat: add AIProvider interface and OpenAI-compatible adapter"
```

---

### Task 3: Backend — Anthropic provider adapter

**Files:**
- Create: `supabase/functions/ai-review/services/providers/anthropic.ts`

**Step 1: Write Anthropic adapter**

```ts
import { AIProvider, ChatCompletionParams } from './types.ts';

export class AnthropicProvider implements AIProvider {
  private baseUrl = 'https://api.anthropic.com/v1';

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
        max_tokens: params.maxTokens ?? 1024,
        temperature: params.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) throw new Error('Empty response from Anthropic');
    return content.trim();
  }
}
```

**Step 2: Commit**

```bash
git add supabase/functions/ai-review/services/providers/anthropic.ts
git commit -m "feat: add Anthropic provider adapter"
```

---

### Task 4: Backend — Gemini provider adapter

**Files:**
- Create: `supabase/functions/ai-review/services/providers/gemini.ts`

**Step 1: Write Gemini adapter**

```ts
import { AIProvider, ChatCompletionParams } from './types.ts';

export class GeminiProvider implements AIProvider {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const url = `${this.baseUrl}/models/${params.model}:generateContent?key=${params.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: params.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.2,
          maxOutputTokens: params.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty response from Gemini');
    return content.trim();
  }
}
```

**Step 2: Commit**

```bash
git add supabase/functions/ai-review/services/providers/gemini.ts
git commit -m "feat: add Google Gemini provider adapter"
```

---

### Task 5: Backend — Refactor aiService.ts to use provider factory

**Files:**
- Modify: `supabase/functions/ai-review/services/aiService.ts`
- Modify: `supabase/functions/ai-review/services/configService.ts`
- Modify: `supabase/functions/ai-review/services/reviewService.ts`

**Step 1: Rewrite `aiService.ts`**

Replace hardcoded OpenRouter fetch with factory + provider routing. Add a `getProvider()` factory function and update `reviewArticleSection()` / `generateRevisionSummary()` to accept `providerName` and `endpoint` parameters.

**Step 2: Update `configService.ts`**

Read `provider` and `endpoint` from `llm_reviewer_config`, pass them into `LLMConfig`.

**Step 3: Update `reviewService.ts` callers**

Pass `config.provider` and `config.endpoint` to `reviewArticleSection()` and `generateRevisionSummary()`.

**Step 4: Commit**

```bash
git add supabase/functions/ai-review/services/aiService.ts supabase/functions/ai-review/services/configService.ts supabase/functions/ai-review/services/reviewService.ts
git commit -m "feat: refactor aiService to use provider adapter pattern"
```

---

### Task 6: Frontend — Add provider selector to UserAccountPage

**Files:**
- Modify: `frontend/src/pages/auth/UserAccountPage.vue`

**Step 1: Add provider options constant**

```ts
const providerOptions = [
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'Custom (OpenAI-compatible)', value: 'custom' },
];
```

**Step 2: Update `llmConfig` ref** — add `provider` and `endpoint` fields.

**Step 3: Add template** — provider `q-select` before model section, custom endpoint `q-input` (shown only when `provider === 'custom'`).

**Step 4: Update `updateLLMConfigInDB`** — save `provider` and `endpoint` to `llm_reviewer_config`.

**Step 5: Update `loadLLMConfig`** — read `provider` and `endpoint`, only auto-fetch models for OpenRouter.

**Step 6: Add `onProviderChange` handler** — clear model selection when switching away from OpenRouter.

**Step 7: Update API Key label** — change "OpenRouter API Key" to "AI Provider API Key".

**Step 8: Commit**

```bash
git add frontend/src/pages/auth/UserAccountPage.vue
git commit -m "feat: add provider selector and custom endpoint to AI settings UI"
```

---

### Task 7: Frontend — Update env.schema.ts

**Files:**
- Modify: `frontend/src/schema/env.schema.ts`

**Step 1: Add AI_PROVIDER env var**

Add `AI_PROVIDER: z.string().default('openrouter')` to schema and the corresponding `process.env.AI_PROVIDER` mapping.

**Step 2: Commit**

```bash
git add frontend/src/schema/env.schema.ts
git commit -m "feat: add AI_PROVIDER environment variable"
```

---

### Task 8: Frontend — Regenerate database.types.ts

**Files:**
- Modify: `frontend/src/types/database.types.ts`

**Step 1: Regenerate**

Run: `supabase gen types typescript --linked > frontend/src/types/database.types.ts`

**Step 2: Commit**

```bash
git add frontend/src/types/database.types.ts
git commit -m "chore: regenerate database types after migration"
```

---

### Task 9: Backend — Update .env.example

**Files:**
- Modify: `supabase/functions/.env.example`

**Step 1: Add AI_PROVIDER** and update OPENROUTER_API_KEY comment.

**Step 2: Commit**

```bash
git add supabase/functions/.env.example
git commit -m "docs: add AI_PROVIDER to env example"
```

---

### Verification

1. Frontend typecheck: `cd frontend && npx vue-tsc --noEmit`
2. Frontend lint: `cd frontend && npm run lint`
3. Migration applies cleanly locally
4. Manual: Open UserAccountPage → switch provider → save → verify in DB
5. Manual: Run AI review with OpenRouter (existing), verify others work with valid API keys
