/*
 * crypto.randomUUID() only exists on secure origins (HTTPS or localhost). Neon's auth SDK calls it
 * as soon as it loads, so on a plain-HTTP address — such as a phone opening the dev server over
 * the local network — the whole sign-in system would fail. crypto.getRandomValues() is available
 * everywhere, so build an RFC 4122 version-4 UUID from it.
 */
const c = globalThis.crypto as (Crypto & { randomUUID?: () => string }) | undefined;
if (c && typeof c.randomUUID !== 'function' && typeof c.getRandomValues === 'function') {
  Object.defineProperty(c, 'randomUUID', {
    configurable: true,
    writable: true,
    value: (): string => {
      const b = c.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    },
  });
}

export {};
