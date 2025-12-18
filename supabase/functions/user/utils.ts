import { Hash, encode } from "https://deno.land/x/checksum@1.2.0/mod.ts";

/**
 * Encodes the given string using MD5 algorithm.
 *
 * @param str - String to encode.
 * @returns MD5 hash of the string.
 */
export function encodeMD5(str: string): string {
  return new Hash("md5").digest(encode(str)).hex();
}
