import { encodeMD5 } from "../utils.ts";

/**
 * Fetches the Gravatar URL associated with the provided email.
 *
 * @param email - The email address for which to fetch the Gravatar URL.
 * @returns the Gravatar URL if found, otherwise returns null.
 */
export default async function getGravatar(
  email: string
): Promise<string | null> {
  const gravatarURL = `https://www.gravatar.com/avatar/${encodeMD5(email)}`;
  const gravatarResponse = await fetch(`${gravatarURL}?d=404`);

  if (gravatarResponse.status !== 200) {
    return null;
  }
  return gravatarURL;
}
