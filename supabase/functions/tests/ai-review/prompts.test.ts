import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRevisionSystemPrompt,
  extractDisplayTitle,
  defaultAiPrompt,
} from "../../ai-review/config/prompts.ts";

Deno.test("extractDisplayTitle pulls the template out", () => {
  const result = extractDisplayTitle("{{DISPLAYTITLE:My Article}}\n\nSome content.");
  assertEquals(result, "{{DISPLAYTITLE:My Article}}");
});

Deno.test("extractDisplayTitle returns empty when not present", () => {
  assertEquals(extractDisplayTitle("== Intro ==\nContent."), "");
  assertEquals(extractDisplayTitle(""), "");
});

Deno.test("extractDisplayTitle is case-insensitive", () => {
  const result = extractDisplayTitle("{{displaytitle:Lower}}\nContent.");
  assertEquals(result, "{{displaytitle:Lower}}");
});

Deno.test("buildSystemPrompt has title and description", () => {
  const result = buildSystemPrompt("My Title", "A description", defaultAiPrompt);
  assertStringIncludes(result, "My Title");
  assertStringIncludes(result, "A description");
});

Deno.test("buildSystemPrompt falls back when description is empty", () => {
  const result = buildSystemPrompt("Title", "", defaultAiPrompt);
  assertStringIncludes(result, "No description available");
});

Deno.test("buildSystemPrompt adds custom instructions when given", () => {
  const result = buildSystemPrompt("Title", "Desc", defaultAiPrompt, "Be brief");
  assertStringIncludes(result, "Be brief");
});

Deno.test("buildSystemPrompt has no custom instructions section by default", () => {
  const result = buildSystemPrompt("Title", "Desc", defaultAiPrompt);
  assertEquals(result.includes("Additional instructions"), false);
});

Deno.test("buildUserPrompt just returns what you give it", () => {
  const content = "some wikitext content";
  assertEquals(buildUserPrompt(content), content);
  assertEquals(buildUserPrompt(""), "");
});

Deno.test("buildRevisionSystemPrompt has article title", () => {
  assertStringIncludes(
    buildRevisionSystemPrompt({ title: "Test Article", description: "A test." }),
    "Test Article"
  );
});

Deno.test("buildRevisionSystemPrompt handles nulls", () => {
  const result = buildRevisionSystemPrompt({ title: null, description: null });
  assertStringIncludes(result, "Unknown");
});
