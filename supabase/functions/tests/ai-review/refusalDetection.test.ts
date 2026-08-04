import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  AIRefusalError,
  assertNotRefusal,
  isRefusalResponse,
  REFUSAL_TOKEN,
} from '../../ai-review/utils/refusalDetection.ts';

Deno.test('detects the exact refusal token', () => {
  assertEquals(isRefusalResponse(REFUSAL_TOKEN), true);
});

Deno.test('detects token with trailing whitespace/newline', () => {
  assertEquals(isRefusalResponse(`${REFUSAL_TOKEN}\n`), true);
  assertEquals(isRefusalResponse(`  ${REFUSAL_TOKEN}  `), true);
});

Deno.test('detects token followed by model explanation', () => {
  assertEquals(isRefusalResponse(`${REFUSAL_TOKEN} due to content policy`), true);
});

Deno.test('does not flag token appearing mid-text', () => {
  assertEquals(isRefusalResponse(`The word ${REFUSAL_TOKEN} appears here`), false);
});

Deno.test('does not flag normal article content', () => {
  assertEquals(
    isRefusalResponse("La Palestine est une région géographique d'Asie occidentale."),
    false,
  );
});

Deno.test('does not flag empty text', () => {
  assertEquals(isRefusalResponse(''), false);
  assertEquals(isRefusalResponse('   '), false);
});

Deno.test('assertNotRefusal throws AIRefusalError on refusal', () => {
  const error = assertThrows(
    () => assertNotRefusal(REFUSAL_TOKEN),
    AIRefusalError,
  );
  assertEquals((error as AIRefusalError).responseText, REFUSAL_TOKEN);
});

Deno.test('assertNotRefusal passes normal content through', () => {
  assertNotRefusal('Un paragraphe normal sur la Palestine.');
});
