import {
  assertEquals,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  parseChangedSections,
  findSectionByHeader,
  applyChangedSections,
} from '../../ai-review/services/wholeArticleParser.ts';

Deno.test('parseChangedSections splits response into header blocks', () => {
  const response = `== History ==
Improved history.

== Reception ==
Improved reception.`;
  const sections = parseChangedSections(response);
  assertEquals(sections.length, 2);
  assertEquals(sections[0].header, 'History');
  assertEquals(sections[0].content, 'Improved history.');
  assertEquals(sections[1].header, 'Reception');
  assertEquals(sections[1].content, 'Improved reception.');
});

Deno.test('parseChangedSections handles nested headers', () => {
  const response = `== History ==
Intro.
=== Early years ===
Details.`;
  const sections = parseChangedSections(response);
  assertEquals(sections.length, 2);
  assertEquals(sections[0].header, 'History');
  assertEquals(sections[0].content, 'Intro.');
  assertEquals(sections[1].header, 'Early years');
  assertEquals(sections[1].content, 'Details.');
});

Deno.test('parseChangedSections returns empty for prose without headers', () => {
  assertEquals(parseChangedSections('just prose'), []);
  assertEquals(parseChangedSections(''), []);
});

Deno.test('findSectionByHeader locates section content', () => {
  const wikitext = `{{DISPLAYTITLE:Test}}
== History ==
Old history.
== Reception ==
Old reception.`;
  const section = findSectionByHeader(wikitext, 'History');
  assertEquals(section, '== History ==\nOld history.');
});

Deno.test('findSectionByHeader returns null for missing header', () => {
  assertEquals(findSectionByHeader('== A ==\nx', 'Missing'), null);
});

Deno.test('findSectionByHeader includes nested subsections', () => {
  const wikitext = `== History ==
Intro.
=== Early years ===
Details.
== Reception ==
Old reception.`;
  const section = findSectionByHeader(wikitext, 'History');
  assertEquals(
    section,
    '== History ==\nIntro.\n=== Early years ===\nDetails.',
  );
});

Deno.test('applyChangedSections replaces matching sections', () => {
  const wikitext = `== History ==
Old history.
== Reception ==
Old reception.`;
  const result = applyChangedSections(wikitext, [
    { header: 'History', content: 'New history.' },
  ]);
  assertEquals(result.replaced, 1);
  assertEquals(
    result.improvedWikitext,
    '== History ==\nNew history.\n== Reception ==\nOld reception.',
  );
});

Deno.test('applyChangedSections skips unchanged sections', () => {
  const wikitext = `== History ==
Same.`;
  const result = applyChangedSections(wikitext, [
    { header: 'History', content: 'Same.' },
  ]);
  assertEquals(result.replaced, 0);
  assertEquals(result.improvedWikitext, wikitext);
});

Deno.test('applyChangedSections skips unknown headers', () => {
  const wikitext = `== History ==
Old.`;
  const result = applyChangedSections(wikitext, [
    { header: 'Missing', content: 'New.' },
  ]);
  assertEquals(result.replaced, 0);
  assertEquals(result.improvedWikitext, wikitext);
});

Deno.test('applyChangedSections preserves original header line exactly', () => {
  const wikitext = `==History==
Old.`;
  const result = applyChangedSections(wikitext, [
    { header: 'History', content: 'New.' },
  ]);
  assertEquals(result.improvedWikitext, '==History==\nNew.');
});