import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRevisionSystemPrompt,
  buildRevisionUserPrompt,
  buildEmptyArticlePrompt,
  cleanAIResponse,
  extractDisplayTitle,
  defaultAiPrompt,
} from '../../ai-review/config/prompts.ts';

Deno.test('extractDisplayTitle pulls the template out', () => {
  const result = extractDisplayTitle(
    '{{DISPLAYTITLE:My Article}}\n\nSome content.',
  );
  assertEquals(result, '{{DISPLAYTITLE:My Article}}');
});

Deno.test('extractDisplayTitle returns empty when not present', () => {
  assertEquals(extractDisplayTitle('== Intro ==\nContent.'), '');
  assertEquals(extractDisplayTitle(''), '');
});

Deno.test('extractDisplayTitle is case-insensitive', () => {
  const result = extractDisplayTitle('{{displaytitle:Lower}}\nContent.');
  assertEquals(result, '{{displaytitle:Lower}}');
});

Deno.test('buildSystemPrompt has title and description', () => {
  const result = buildSystemPrompt(
    'My Title',
    'A description',
    defaultAiPrompt,
  );
  assertStringIncludes(result, 'My Title');
  assertStringIncludes(result, 'A description');
});

Deno.test('buildSystemPrompt falls back when description is empty', () => {
  const result = buildSystemPrompt('Title', '', defaultAiPrompt);
  assertStringIncludes(result, 'No description available');
});

Deno.test('buildSystemPrompt adds custom instructions when given', () => {
  const result = buildSystemPrompt(
    'Title',
    'Desc',
    defaultAiPrompt,
    'Be brief',
  );
  assertStringIncludes(result, 'Be brief');
});

Deno.test(
  'buildSystemPrompt has no custom instructions section by default',
  () => {
    const result = buildSystemPrompt('Title', 'Desc', defaultAiPrompt);
    assertEquals(result.includes('Additional instructions'), false);
  },
);

Deno.test('buildUserPrompt just returns what you give it', () => {
  const content = 'some wikitext content';
  assertEquals(buildUserPrompt(content), content);
  assertEquals(buildUserPrompt(''), '');
});

Deno.test('buildRevisionSystemPrompt has article title', () => {
  assertStringIncludes(
    buildRevisionSystemPrompt({
      title: 'Test Article',
      description: 'A test.',
    }),
    'Test Article',
  );
});

Deno.test('buildRevisionSystemPrompt handles nulls', () => {
  const result = buildRevisionSystemPrompt({ title: null, description: null });
  assertStringIncludes(result, 'Unknown');
});

Deno.test(
  'buildRevisionSystemPrompt marks wikitext context as read only',
  () => {
    const result = buildRevisionSystemPrompt(
      { title: 'Article', description: null },
      '== Section ==\nSome content.',
    );
    assertStringIncludes(result, 'READ ONLY');
    assertStringIncludes(result, '== Section ==');
  },
);

Deno.test(
  'buildRevisionSystemPrompt without wikitext has no context block',
  () => {
    const result = buildRevisionSystemPrompt({
      title: 'Article',
      description: 'Desc',
    });
    assertEquals(result.includes('ARTICLE CONTEXT'), false);
  },
);

Deno.test('buildRevisionUserPrompt has the paragraph and instruction', () => {
  const result = buildRevisionUserPrompt('The fox.', 'Make it shorter.', 0);
  assertStringIncludes(result, 'The fox.');
  assertStringIncludes(result, 'Make it shorter.');
});

Deno.test('buildRevisionUserPrompt maps status numbers to labels', () => {
  assertStringIncludes(buildRevisionUserPrompt('p', 'i', 0), 'pending');
  assertStringIncludes(buildRevisionUserPrompt('p', 'i', 1), 'approved');
  assertStringIncludes(buildRevisionUserPrompt('p', 'i', 2), 'rejected');
  assertStringIncludes(buildRevisionUserPrompt('p', 'i', 99), 'unknown');
});

Deno.test('buildEmptyArticlePrompt has title and description', () => {
  const result = buildEmptyArticlePrompt({
    title: 'New Article',
    description: 'About cats.',
  });
  assertStringIncludes(result, 'New Article');
  assertStringIncludes(result, 'About cats.');
});

Deno.test('buildEmptyArticlePrompt handles nulls', () => {
  const result = buildEmptyArticlePrompt({ title: null, description: null });
  assertStringIncludes(result, 'Unknown');
  assertStringIncludes(result, 'No description available');
});

Deno.test('cleanAIResponse trims whitespace', () => {
  assertEquals(cleanAIResponse('  Improved.  ', 'Original.'), 'Improved.');
});

Deno.test(
  'cleanAIResponse falls back to original when response is too short',
  () => {
    const original =
      'This is a fairly long original content string that should be kept.';
    assertEquals(cleanAIResponse('Hi', original), original);
  },
);

Deno.test('cleanAIResponse re-adds DISPLAYTITLE if response dropped it', () => {
  const original = '{{DISPLAYTITLE:My Article}}\nOriginal body.';
  const result = cleanAIResponse('Improved body without title.', original);
  assertStringIncludes(result, '{{DISPLAYTITLE:My Article}}');
});

Deno.test('cleanAIResponse does not duplicate DISPLAYTITLE', () => {
  const original = '{{DISPLAYTITLE:My Article}}\nOriginal.';
  const response = '{{DISPLAYTITLE:My Article}}\nImproved.';
  const count = (s: string, sub: string) => s.split(sub).length - 1;
  assertEquals(
    count(cleanAIResponse(response, original), '{{DISPLAYTITLE:My Article}}'),
    1,
  );
});

Deno.test('defaultAiPrompt is a non-empty string mentioning Mira', () => {
  assertEquals(typeof defaultAiPrompt, 'string');
  assertStringIncludes(defaultAiPrompt, 'Mira');
});
