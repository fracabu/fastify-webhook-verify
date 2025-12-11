import { timingSafeEqual } from 'crypto';

/**
 * Compare two strings in a timing-safe manner
 * Returns true if the strings are equal, false otherwise
 */
export function timingSafeCompare(a: string, b: string, encoding: 'hex' | 'base64'): boolean {
  try {
    const bufA = Buffer.from(a, encoding);
    const bufB = Buffer.from(b, encoding);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
