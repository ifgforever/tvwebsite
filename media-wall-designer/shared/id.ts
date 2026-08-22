/** Short, sortable-enough ids that work in the browser and in a Worker. */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function uid(prefix = ''): string {
  const bytes = new Uint8Array(10);
  (globalThis as unknown as { crypto: { getRandomValues(a: Uint8Array): Uint8Array } }).crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % 36];
  const t = Date.now().toString(36);
  return `${prefix}${prefix ? '_' : ''}${t}${out.slice(0, 6)}`;
}
