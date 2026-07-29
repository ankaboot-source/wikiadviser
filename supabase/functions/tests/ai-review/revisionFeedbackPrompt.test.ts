import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildRevisionSystemPrompt, buildRevisionFeedbackPrompt } from '../../ai-review/config/prompts.ts';

Deno.test(
  'prompts: buildRevisionSystemPrompt marks revision-context output as full-article',
  () => {
    const result = buildRevisionSystemPrompt(
      { title: 'Article', description: 'Desc' },
      '== Section ==\nSome content.',
      true,
    );
    assertStringIncludes(result, 'You are Mira');
    assertStringIncludes(result, 'Return ONLY the full revised wikitext');
    assertStringIncludes(result, 'READ ONLY');
  },
);

Deno.test(
  'prompts: buildRevisionSystemPrompt without wikitext has no context block',
  () => {
    const result = buildRevisionSystemPrompt({
      title: 'Article',
      description: 'Desc',
    }, undefined, true);
    assertEquals(result.includes('ARTICLE CONTEXT'), false);
  },
);

Deno.test(
  'prompts: buildRevisionFeedbackPrompt embeds feedback as numbered lines',
  () => {
    const feedback = ['Use just one title', 'Add infobox'];
    const wikitext = '{{DISPLAYTITLE:Title}}\n\nBody.';
    const result = buildRevisionFeedbackPrompt(wikitext, feedback);
    assertStringIncludes(result, '1. Use just one title');
    assertStringIncludes(result, '2. Add infobox');
    assertStringIncludes(result, wikitext);
    assertStringIncludes(result, 'CURRENT ARTICLE');
  },
);

Deno.test(
  'prompts: buildRevisionFeedbackPrompt preserves structural preservation rules',
  () => {
    const result = buildRevisionFeedbackPrompt('Body.', ['Cleanup grammar']);
    assertStringIncludes(result, 'Copy ALL wikitext structural lines');
    assertStringIncludes(result, 'two or more equals signs');
  },
);
