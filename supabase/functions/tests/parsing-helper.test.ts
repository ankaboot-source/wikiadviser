import { assertEquals } from "jsr:@std/assert@1";
import {
  addSourceExternalLinks,
  addSourceTemplate,
  convertSourceTemplateToLink,
} from "../_shared/helpers/parsingRegex.ts";

const basePath = new URL("./data/parsingWikitext/fixSources/", import.meta.url);

const pageContentPath = new URL("pageContent.txt", basePath);
const expectedAddSourceExternalLinksPath = new URL(
  "expectedAddSourceExternalLinks.txt",
  basePath
);
const expectedAddSourceTemplatePath = new URL(
  "expectedAddSourceTemplate.txt",
  basePath
);
const expectedConvertSourceTemplateToLinkPath = new URL(
  "expectedConvertSourceTemplateToLink.txt",
  basePath
);

const sourceLanguage = "fr";
const pageContent = Deno.readTextFileSync(pageContentPath);
const expectedAddSourceExternalLinks = Deno.readTextFileSync(
  expectedAddSourceExternalLinksPath
);
Deno.test("Testing wikitext parsing: Adds source to external links", () => {
  assertEquals(
    addSourceExternalLinks(pageContent, sourceLanguage),
    expectedAddSourceExternalLinks
  );
});

const expectedAddSourceTemplate = Deno.readTextFileSync(
  expectedAddSourceTemplatePath
);
Deno.test("Testing wikitext parsing: Adds source to templates", () => {
  assertEquals(
    addSourceTemplate(expectedAddSourceExternalLinks, sourceLanguage),
    expectedAddSourceTemplate
  );
});

const expectedConvertSourceTemplateToLink = Deno.readTextFileSync(
  expectedConvertSourceTemplateToLinkPath
);
Deno.test(
  "Testing wikitext parsing: Converts certain templates to links",
  () => {
    assertEquals(
      convertSourceTemplateToLink(expectedAddSourceTemplate, sourceLanguage),
      expectedConvertSourceTemplateToLink
    );
  }
);
