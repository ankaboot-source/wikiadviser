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
    const expectedAddSourceExternalLinksPath = join(
      basePath,
      'expectedAddSourceExternalLinks.txt'
    );
    const expectedAddSourceTemplatePath = join(
      basePath,
      'expectedAddSourceTemplate.txt'
    );
    const expectedConvertSourceTemplateToLinkPath = join(
      basePath,
      'expectedConvertSourceTemplateToLink.txt'
    );

    const sourceLanguage = 'fr';
    const pageContent = readFileSync(pageContentPath, 'utf-8');
    const expectedAddSourceExternalLinks = readFileSync(
      expectedAddSourceExternalLinksPath,
      'utf-8'
    );
    const expectedAddSourceTemplate = readFileSync(
      expectedAddSourceTemplatePath,
      'utf-8'
    );
    const expectedConvertSourceTemplateToLink = readFileSync(
      expectedConvertSourceTemplateToLinkPath,
      'utf-8'
    );

    it('Adds source to external links', () => {
      expect(addSourceExternalLinks(pageContent, sourceLanguage)).toBe(
        expectedAddSourceExternalLinks
      );
    });
    it('Adds source to templates', () => {
      expect(
        addSourceTemplate(expectedAddSourceExternalLinks, sourceLanguage)
      ).toBe(expectedAddSourceTemplate);
    });
    it('Converts certain templates to links', () => {
      expect(
        convertSourceTemplateToLink(expectedAddSourceTemplate, sourceLanguage)
      ).toBe(expectedConvertSourceTemplateToLink);
    });
  });
});
