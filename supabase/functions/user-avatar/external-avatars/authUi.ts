import { encodeMD5 } from "../utils.ts";
import ColorsGenerator from "../colors-generator/Generator.ts";

/**
 * Builds a UI avatar URL based on the provided email and colors.
 *
 * @param email - The email address used to generate the avatar.
 * @param backgroundColor - The background color of the avatar.
 * @param fontColor - The font color of the avatar.
 * @param charactersLength [charactersLength=1] - The number of characters to display in the avatar.
 * @returns the URL of the generated UI avatar.
 */
function buildAuthUiAvatar(
  email: string,
  backgroundColor: string,
  fontColor: string,
  charactersLength = 1
) {
  return `https://ui-avatars.com/api/?background=${backgroundColor}&color=${fontColor}&length=${charactersLength}&name=${email}`;
}

/**
 * Generate an avatar URL based on the provided email and background colors.
 *
 * @param email - The email address used to generate the avatar.
 * @param backgroundColors - Array of background colors to choose from.
 * @returns the URL of the generated UI avatar.
 */
export default function generateAvatar(
  email: string,
  backgroundColors: string[],
) {
  const { mainColor, fontColor } = new ColorsGenerator(
    encodeMD5(email),
    backgroundColors
  ).generateColors();
  return buildAuthUiAvatar(email, mainColor, fontColor);
}
