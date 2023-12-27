/**
 * Converts a hexadecimal color string to RGB format.
 *
 * @param hex - Hexadecimal color string.
 * @returns RGB object representing the color.
 */
function hexToRgb(hex: string): RGB {
  return {
    red: parseInt(hex.substring(0, 2), 16),
    green: parseInt(hex.substring(2, 4), 16),
    blue: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Converts an RGB color to its hexadecimal representation.
 *
 * @param rgb - RGB color object.
 * @returns Hexadecimal string representing the color.
 */
function rgbToHex(rgb: RGB): string {
  return `${rgb.red.toString(16)}${rgb.green.toString(16)}${rgb.blue.toString(
    16
  )}`;
}

/**
 * Calculates the luminance of an RGB color.
 *
 * @param rgb - RGB color object.
 * @returns Luminance value of the color.
 */
function calculateLuminance(rgb: RGB): number {
  const r = rgb.red / 255;
  const g = rgb.green / 255;
  const b = rgb.blue / 255;

  const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * Utility class for generating colors based on a hash and a set of colors.
 */
export default class ColorGenerator {
  /**
   * Recommenedd by WCAG 2.0 for calculating contrast ratio.
   */
  private readonly CONTRAST_RECOMANDATION: number = 4.5;
  /**
   * The higher the value, the darker the color.
   */
  private readonly CROSS_COLORS_LUMINANCE: number = 0.4;
  /**
   * The higher the value, the darker the color.
   */
  private readonly FONT_WHITE_LUMINANCE: number = 0.5;

  private readonly baseColor: RGB;
  private readonly backgroundColors: RGB[];

  /**
   * Initializes the ColorGenerator utility.
   *
   * @param hash - Hash string.
   * @param colors - Array of color strings.
   */
  constructor(
    private readonly hash: string,
    private readonly backgroundHexColors: string[]
  ) {
    this.baseColor = hexToRgb(hash.substring(0, 6));
    this.backgroundColors = backgroundHexColors.map(hexToRgb);
  }

  /**
   * Generates and returns a color based on the hash and background colors.
   *
   * @returns Object containing the main color and font color.
   */
  generateColors(): { mainColor: string; fontColor: string } {
    let contrasted = false;

    for (const bg of this.backgroundColors) {
      while (
        !contrasted &&
        calculateLuminance(this.baseColor) < this.LUMINANCE_RECOMANDATION
      ) {
        this.baseColor.red = Math.min(255, this.baseColor.red + 10);
        this.baseColor.green = Math.min(255, this.baseColor.green + 10);
        this.baseColor.blue = Math.min(255, this.baseColor.blue + 10);

        const contrastRatio =
          Math.max(calculateLuminance(this.baseColor), calculateLuminance(bg)) /
          Math.min(calculateLuminance(this.baseColor), calculateLuminance(bg));

        contrasted = contrastRatio >= this.CONTRAST_RECOMANDATION;
      }
    }

    return {
      color: rgbToHex(this.baseColor),
      fontColor:
        calculateLuminance(this.baseColor) < this.FONT_WHITE_LUMINANCE
          ? "ffffff"
          : "000000",
    };
  }
}
