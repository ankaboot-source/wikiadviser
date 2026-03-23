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
): string {
  if (!name) {
    const index = Math.floor(Math.random() * ANON_COUNT) + 1;
    return getStorageUrl(`${ANON_FOLDER}/AV${index}.png`);
  }

  const hash = encodeMD5(name);
  const index = (Number.parseInt(hash.substring(0, 8), 16) % ANON_COUNT) + 1;
  return getStorageUrl(`${ANON_FOLDER}/AV${index}.png`);
}