import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  addSourceExternalLinks,
  addSourceTemplate,
  convertSourceTemplateToLink
} from '../src/helpers/parsingHelper';

describe('Testing wikitext parsing (XML file)', () => {
  describe('Wikitext sources are fixed when', () => {
    const basePath = join(__dirname, './data/parsingWikitext/fixSources');
    const pageContentPath = join(basePath, 'pageContent.txt');
    const expected_addSourceExternalLinksPath = join(
      basePath,
      'expected_addSourceExternalLinks.txt'
    );
    const expected_addSourceTemplatePath = join(
      basePath,
      'expected_addSourceTemplate.txt'
    );
    const expected_convertSourceTemplateToLinkPath = join(
      basePath,
      'expected_convertSourceTemplateToLink.txt'
    );

    const sourceLanguage = 'fr';
    const pageContent = readFileSync(pageContentPath, 'utf-8');
    const expected_addSourceExternalLinks = readFileSync(
      expected_addSourceExternalLinksPath,
      'utf-8'
    );
    const expected_addSourceTemplate = readFileSync(
      expected_addSourceTemplatePath,
      'utf-8'
    );
    const expected_convertSourceTemplateToLink = readFileSync(
      expected_convertSourceTemplateToLinkPath,
      'utf-8'
    );

    it('Adds source to external links', () => {
      expect(addSourceExternalLinks(pageContent, sourceLanguage)).toBe(
        expected_addSourceExternalLinks
      );
    });
    it('Adds source to templates', () => {
      expect(
        addSourceTemplate(expected_addSourceExternalLinks, sourceLanguage)
      ).toBe(expected_addSourceTemplate);
    });
    it('Converts certain templates to links', () => {
      expect(
        convertSourceTemplateToLink(expected_addSourceTemplate, sourceLanguage)
      ).toBe(expected_convertSourceTemplateToLink);
    });
  });
});
