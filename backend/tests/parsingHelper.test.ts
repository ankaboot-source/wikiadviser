import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { fixSources } from '../src/helpers/parsingHelper';

describe('Testing wikitext parsing (XML file)', () => {
  describe('Wikitext sources are fixed when', () => {
    it('Adds source to external links and templates, converts certain templates to links', () => {
      const basePath = join(__dirname, './data/parsingWikitext/fixSources');
      const pageContentPath = join(basePath, 'pageContent.txt');
      const expectedPath = join(basePath, 'expected.txt');

      const sourceLanguage = 'fr';
      const pageContent = readFileSync(pageContentPath, 'utf-8');
      const expected = readFileSync(expectedPath, 'utf-8');
      expect(fixSources(pageContent, sourceLanguage)).toBe(expected);
    });
  });
});
