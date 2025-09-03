import ColorsGenerator from "../colors-generator/Generator.ts";
import { encodeMD5 } from "../utils.ts";

/**
 * Builds a UI avatar URL based on the provided name and colors.
 *
 * @param name - The name used to generate the avatar.
 * @param backgroundColor - The background color of the avatar.
 * @param fontColor - The font color of the avatar.
 * @param charactersLength [charactersLength=1] - The number of characters to display in the avatar.
 * @returns the URL of the generated UI avatar.
 */
function generateAvatar(
  name: string,
  backgroundColor: string,
  fontColor: string,
  charactersLength = 1,
) {
  return `https://avatar.iran.liara.run/username?username=${name}&background=${backgroundColor}&color=${fontColor}&length=${charactersLength}`;
}

function generateAnonymousAvatar() {
  return `https://avatar.iran.liara.run/public?username=${
    String(Math.floor(Math.random() * 10000)).padStart(4, "0")
  }`;
}

/**
 * Generate an avatar URL based on the provided name and background colors.
 *
 * @param name - The name used to generate the avatar.
 * @param backgroundColors - Array of background colors to choose from.
 * @returns the URL of the generated UI avatar.
 */
export default function buildAvatar(
  name: string | null,
  backgroundColors: string[],
) {
  if (!name) {
    return generateAnonymousAvatar();
  }

  const { color, fontColor } = new ColorsGenerator(
    encodeMD5(name),
    backgroundColors,
  ).generateColors();

  return generateAvatar(name, color, fontColor);
}
