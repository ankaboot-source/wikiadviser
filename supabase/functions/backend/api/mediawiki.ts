import { fetch } from "undici";
import { ENV } from "../schema/env.schema.ts";
// type LanguageCode = (typeof ENV.WIKIADVISER_LANGUAGES)[number]; // Define the language code type

const mediawikiApiInstances = new Map<string, string>();
for (const language of ENV.WIKIADVISER_LANGUAGES) {
  mediawikiApiInstances.set(
    language,
    `${ENV.MEDIAWIKI_ENDPOINT}/${language}/api.php`,
  );
}

/**
 * Makes a request to the MediaWiki API for a given language.
 *
 * @param language The language code (e.g., 'en', 'fr').
 * @param params An object containing the API parameters.
 * @returns A promise that resolves to the API response data, or null if an error occurs.
 */
export async function makeMediawikiApiRequest(
  language: string,
  params: Record<string, string>,
): Promise<unknown | null> {
  const baseURL = mediawikiApiInstances.get(language);

  if (!baseURL) {
    console.error(`Invalid language code: ${language}`);
    return null;
  }

  const url = new URL(baseURL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      dispatcher: new Agent({ connect: { rejectUnauthorized: false } }),
    });

    if (!response.ok) {
      console.error(
        `MediaWiki API request failed with status ${response.status}`,
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error making MediaWiki API request:", error);
    return null;
  }
}
import { Agent } from "undici";
