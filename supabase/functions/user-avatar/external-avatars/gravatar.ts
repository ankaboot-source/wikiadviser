import { encodeMD5 } from "../utils.ts";

/**
 * Fetches the Gravatar URL associated with the provided email.
 * If no Gravatar is found for the email, it returns null.
 *
 * @param email - The email address for which to fetch the Gravatar URL.
 * @returns the Gravatar URL if found, otherwise returns null.
 */
export default async function getGravatar(
  email: string
): Promise<string | null> {
  const gravatarURL = `https://www.gravatar.com/avatar/${encodeMD5(email)}`;

  const gravatarResponse = await fetch(
    `https://www.gravatar.com/avatar/${encodeMD5(email)}?d=404`
  );

  if (gravatarResponse.status !== 200) {
    return null;
  }
  return gravatarURL;
}
