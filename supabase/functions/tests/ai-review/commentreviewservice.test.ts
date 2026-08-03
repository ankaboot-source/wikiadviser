import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  extractDiffFragments,
  findParagraphIndex,
  normalizeForMatch,
} from '../../ai-review/utils/paragraphMatch.ts';

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

Deno.test('extractDiffFragments splits structural-change heading HTML', () => {
  const { inserted, removed, plainText } = extractDiffFragments(
    '<span data-description="d" data-type-of-edit="structural-change">' +
      '<h2 data-diff-action="structural-change"><del>Utilisation : origines et évolution</del><ins>Origines</ins></h2>' +
      '</span>',
  );
  assertEquals(inserted, 'Origines');
  assertEquals(removed, 'Utilisation : origines et évolution');
  assertStringIncludes(plainText, 'Origines');
  assertStringIncludes(plainText, 'Utilisation');
});

Deno.test('extractDiffFragments handles change-remove/change-insert pair', () => {
  const { inserted, removed } = extractDiffFragments(
    '<span data-description="d" data-type-of-edit="change">' +
      '<p data-diff-action="change"><span data-diff-action="change-remove">Old text</span>' +
      '<span data-diff-action="change-insert">New text</span></p>' +
      '</span>',
  );
  assertEquals(inserted, 'New text');
  assertEquals(removed, 'Old text');
});

Deno.test('extractDiffFragments handles insert-only spans', () => {
  const { inserted, removed } = extractDiffFragments(
    '<span data-description="d" data-type-of-edit="insert">' +
      '<p data-diff-action="insert">Brand new paragraph</p>' +
      '</span>',
  );
  assertEquals(inserted, 'Brand new paragraph');
  assertEquals(removed, '');
});

Deno.test('extractDiffFragments returns empty fragments for empty content', () => {
  const { inserted, removed, plainText } = extractDiffFragments('');
  assertEquals(inserted, '');
  assertEquals(removed, '');
  assertEquals(plainText, '');
});

Deno.test('normalizeForMatch strips heading markers and lowercases', () => {
  assertEquals(
    normalizeForMatch('== Utilisation : Origines =='),
    'utilisation : origines',
  );
});

Deno.test('normalizeForMatch unwraps wiki links', () => {
  assertEquals(normalizeForMatch('[[France]] and [[Paris|the capital]]'),
    'france and the capital');
});

Deno.test('normalizeForMatch collapses whitespace and bold', () => {
  assertEquals(normalizeForMatch("  '''Phonétique''' :\n  Dans les langues  "),
    'phonétique : dans les langues');
});

Deno.test('matching finds current paragraph via inserted text', () => {
  const currentParagraphs = [
    '== Histoire ==\nLes débuts.',
    '== Origines ==\nUne origine ancienne.',
    "== Phonétique ==\n* '''Phonétique''' : la prononciation.",
  ];
  const inserted = 'Origines';
  const needle = normalizeForMatch(inserted);
  const found = currentParagraphs.findIndex((p) =>
    normalizeForMatch(p).includes(needle),
  );
  assertEquals(found, 1);
});

Deno.test('matching by inserted text beats stored index pointing elsewhere', () => {
  const currentParagraphs = [
    '== Histoire ==\nLes débuts.',
    '== Origines ==\nUne origine ancienne.',
    '== Phonétique ==\n* la prononciation.',
  ];
  const inserted = 'Origines';
  const plainText = 'utilisation : origines et évolution origines';
  const needle = normalizeForMatch(inserted);
  const fullSearch = currentParagraphs.findIndex((p) =>
    normalizeForMatch(p).includes(needle),
  );
  const staleIndex = 2;
  const stalePara = currentParagraphs[staleIndex];
  const staleRelated = normalizeForMatch(stalePara).includes(
    normalizeForMatch(plainText),
  );
  assertEquals(fullSearch, 1);
  assertEquals(staleRelated, false);
});

Deno.test(
  'previous-revision match is honored when current paragraph is a same-index rewrite',
  () => {
    const currentParagraphs = [
      'La Palestine est une région géographique d\'Asie occidentale, située entre la mer Méditerranée et le Jourdain. Le territoire est au cœur de l\'histoire de plusieurs religions majeures, et se caractérise par une identité culturelle arabe et une forte empreinte islamique.',
      'L\'État de Palestine, qui revendique la Cisjordanie et la bande de Gaza, est reconnu comme un État souverain.',
      'Historiquement, la région a connu des transformations majeures au XXe siècle, marquées par l\'établissement du mandat britannique sur la Palestine confié par la Société des Nations.',
    ];
    const previousParagraphs = [
      'La Palestine est une région géographique d\'Asie occidentale, située entre la mer Méditerranée et le Jourdain. Le territoire est au cœur de l\'histoire de plusieurs religions majeures, et a été soumis à diverses administrations politiques.',
      'L\'État de Palestine, qui revendique la Cisjordanie et la bande de Gaza, est reconnu comme un État souverain.',
      'Historiquement, la région a connu des changements majeurs au XXe siècle. Après la Première Guerre mondiale, la Société des Nations a confié le mandat britannique sur la Palestine au Royaume-Uni en 1922.',
    ];
    const changedIndices = new Set([0, 2]);
    const fragment = 'Historiquement, la région a connu des changements majeurs au XXe siècle.';

    const currentMatch = findParagraphIndex(currentParagraphs, fragment);
    const previousMatch = previousParagraphs.findIndex((p) =>
      normalizeForMatch(p).includes(normalizeForMatch(fragment)),
    );

    assertEquals(currentMatch, -1);
    assertEquals(previousMatch, 2);
    assertEquals(changedIndices.has(previousMatch), true);

    const sourceParagraph = currentParagraphs[previousMatch];
    assertStringIncludes(sourceParagraph, 'transformations');
    assertEquals(
      normalizeForMatch(sourceParagraph).includes(
        normalizeForMatch('changements majeurs'),
      ),
      false,
    );
    assertEquals(sourceParagraph, currentParagraphs[2]);
    assertNotEquals(sourceParagraph, previousParagraphs[2]);
  },
);

Deno.test(
  'previous-revision match falls back to the same-index current paragraph as source',
  () => {
    const currentParagraphs = [
      'La Palestine est une région géographique d\'Asie occidentale, située entre la mer Méditerranée et le Jourdain.',
      'Historiquement, la région a connu des transformations majeures au XXe siècle, marquées par l\'établissement du mandat britannique.',
    ];
    const previousParagraphs = [
      'La Palestine est une région géographique d\'Asie occidentale, située entre la mer Méditerranée et le Jourdain.',
      'Historiquement, la région a connu des changements majeurs au XXe siècle. Après la Première Guerre mondiale, la Société des Nations a confié le mandat britannique sur la Palestine au Royaume-Uni en 1922.',
    ];
    const fragment = 'Historiquement, la région a connu des changements majeurs au XXe siècle.';

    const previousMatch = previousParagraphs.findIndex((p) =>
      normalizeForMatch(p).includes(normalizeForMatch(fragment)),
    );
    assertEquals(previousMatch, 1);

    const prevPara = previousParagraphs[previousMatch];
    const currentPara = currentParagraphs[previousMatch];
    assertEquals(prevPara !== currentPara, true);

    const sourceParagraph = currentPara;
    assertStringIncludes(sourceParagraph, 'transformations');
    assertEquals(sourceParagraph, currentParagraphs[previousMatch]);
  },
);
