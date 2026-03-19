import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';

function splitIntoParagraphs(wikitext: string): string[] {
  return wikitext.split(/\n\n+/).filter((p) => p.trim().length > 0);
}

function extractLeadingDirectives(wikitext: string): {
  directives: string;
  body: string;
} {
  const lines = wikitext.split('\n');
  const directiveLines: string[] = [];
  for (const line of lines) {
    if (/^\s*\{\{[^}]+\}\}\s*$/.test(line)) {
      directiveLines.push(line);
    } else {
      break;
    }
  }
  if (directiveLines.length === 0) return { directives: '', body: wikitext };
  const directives = directiveLines.join('\n');
  const body = wikitext.slice(directives.length).replace(/^\n+/, '');
  return { directives, body };
}

Deno.test('splitIntoParagraphs splits on double newline', () => {
  const result = splitIntoParagraphs('Para one.\n\nPara two.\n\nPara three.');
  assertEquals(result.length, 3);
  assertEquals(result[0], 'Para one.');
  assertEquals(result[2], 'Para three.');
});

Deno.test('splitIntoParagraphs ignores empty paragraphs', () => {
  assertEquals(splitIntoParagraphs('Para one.\n\n\n\nPara two.').length, 2);
  assertEquals(splitIntoParagraphs('').length, 0);
  assertEquals(splitIntoParagraphs('   \n\n  \n  ').length, 0);
});

Deno.test('splitIntoParagraphs single paragraph stays as one', () => {
  const result = splitIntoParagraphs('Just one paragraph.');
  assertEquals(result.length, 1);
  assertEquals(result[0], 'Just one paragraph.');
});

Deno.test('splitIntoParagraphs keeps wikitext markers intact', () => {
  const result = splitIntoParagraphs(
    '== Section ==\nContent.\n\n[[Link|Text]] more.',
  );
  assertStringIncludes(result[0], '== Section ==');
  assertStringIncludes(result[1], '[[Link|Text]]');
});

Deno.test('extractLeadingDirectives pulls out DISPLAYTITLE', () => {
  const { directives, body } = extractLeadingDirectives(
    '{{DISPLAYTITLE:My Article}}\n\nFirst paragraph.',
  );
  assertEquals(directives, '{{DISPLAYTITLE:My Article}}');
  assertStringIncludes(body, 'First paragraph.');
});

Deno.test(
  'extractLeadingDirectives handles multiple consecutive directives',
  () => {
    const { directives, body } = extractLeadingDirectives(
      '{{DISPLAYTITLE:Title}}\n{{Short description|About X}}\n\nContent.',
    );
    assertStringIncludes(directives, '{{DISPLAYTITLE:Title}}');
    assertStringIncludes(directives, '{{Short description|About X}}');
    assertStringIncludes(body, 'Content.');
  },
);

Deno.test(
  'extractLeadingDirectives returns empty directives when none present',
  () => {
    const wikitext = '== Intro ==\nSome content.';
    const { directives, body } = extractLeadingDirectives(wikitext);
    assertEquals(directives, '');
    assertEquals(body, wikitext);
  },
);

Deno.test('extractLeadingDirectives stops at first non-directive line', () => {
  const { directives, body } = extractLeadingDirectives(
    '{{DISPLAYTITLE:Title}}\nNot a directive.\n{{Short description|X}}',
  );
  assertEquals(directives, '{{DISPLAYTITLE:Title}}');
  assertStringIncludes(body, 'Not a directive.');
});

Deno.test('extractLeadingDirectives body has no leading newlines', () => {
  const { body } = extractLeadingDirectives(
    '{{DISPLAYTITLE:Title}}\n\nActual content.',
  );
  assertEquals(body.startsWith('\n'), false);
  assertStringIncludes(body, 'Actual content.');
});

Deno.test(
  'extractLeadingDirectives empty input returns empty both sides',
  () => {
    const { directives, body } = extractLeadingDirectives('');
    assertEquals(directives, '');
    assertEquals(body, '');
  },
);

Deno.test('target index matching - finds paragraph by content', () => {
  const paragraphs = [
    'Some other paragraph.',
    'The quick brown fox jumps.',
    'Another one.',
  ];
  const plainText = 'the quick brown fox jumps.';
  const matched = paragraphs.findIndex((p) =>
    p.toLowerCase().includes(plainText),
  );
  assertEquals(matched, 1);
});

Deno.test(
  'target index matching - falls back to index when content not found',
  () => {
    const paragraphs = ['Para one.', 'Para two.', 'Para three.'];
    const matched = paragraphs.findIndex((p) =>
      p.includes('not in any paragraph'),
    );
    const fallback = 1;
    const result =
      matched !== -1 ? matched : Math.min(fallback, paragraphs.length - 1);
    assertEquals(result, 1);
  },
);

Deno.test('target index matching - clamps out-of-bounds index', () => {
  const paragraphs = ['Para one.', 'Para two.'];
  assertEquals(Math.min(10, paragraphs.length - 1), 1);
});

Deno.test(
  'target index matching - returns -1 when nothing matches and index is null',
  () => {
    const paragraphs = ['Para one.', 'Para two.'];
    const matched = paragraphs.findIndex((p) => p.includes('xyz'));
    const fallback: number | null = null;
    const result =
      matched !== -1
        ? matched
        : fallback !== null
          ? Math.min(fallback, paragraphs.length - 1)
          : -1;
    assertEquals(result, -1);
  },
);
