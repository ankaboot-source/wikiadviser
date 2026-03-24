import { encodeMD5 } from '../utils.ts';
import ColorsGenerator from './colorsGenerator.ts';
import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';

const AVATARS_BUCKET = 'logo';
const ANON_FOLDER = 'images/avatars';
const ANON_COUNT = 100;

const supabaseAdmin = createSupabaseAdmin();

function getStorageUrl(path: string): string {
  const { data } = supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

function buildInitialsSvg(
  name: string,
  backgroundColor: string,
  fontColor: string,
): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <circle cx="64" cy="64" r="64" fill="#${backgroundColor}"/>
  <text
    x="64"
    y="64"
    text-anchor="middle"
    alignment-baseline="central"
    font-family="Arial, Helvetica, sans-serif"
    font-size="56"
    font-weight="bold"
    fill="#${fontColor}"
  >${initials}</text>
</svg>`;
}

async function uploadSvg(userId: string, svg: string): Promise<string> {
  const filePath = `images/avatars/user-${userId}.svg`;
  const encoder = new TextEncoder();

  const { error } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, encoder.encode(svg), {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (error) {
    console.error('Failed to upload initials SVG:', error.message);
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  return getStorageUrl(filePath);
}

/**
 * Generate an avatar URL based on the provided name and background colors.
 *
 * @param name - The name used to generate the avatar.
 * @param backgroundColors - Array of background colors to choose from.
 * @returns the URL of the generated UI avatar.
 */
export default async function buildAvatar(
  userId: string,
  name: string | null,
  backgroundColors: string[],
): Promise<string> {
  if (!name) {
    const index = Math.floor(Math.random() * ANON_COUNT) + 1;
    return getStorageUrl(`${ANON_FOLDER}/AV${index}.png`);
  }

  const hash = encodeMD5(name);
  const { color, fontColor } = new ColorsGenerator(
    hash,
    backgroundColors,
  ).generateColors();

  const svg = buildInitialsSvg(name, color, fontColor);
  return await uploadSvg(userId, svg);
}
