import { describe, expect, it } from 'vitest';
import { hmacSha256, pbkdf2Sha256, sha256Bytes } from './sha256';

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const utf8 = (s: string) => new TextEncoder().encode(s);

describe('pure SHA-256 / PBKDF2 fallback', () => {
  it('matches SHA-256 test vectors', () => {
    expect(hex(sha256Bytes(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hex(sha256Bytes(utf8('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha256Bytes(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('matches HMAC-SHA-256 (RFC 4231 case 2)', () => {
    expect(hex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?')))).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });

  it('matches PBKDF2-HMAC-SHA-256 test vectors', () => {
    expect(hex(pbkdf2Sha256(utf8('passwd'), utf8('salt'), 1, 64))).toBe(
      '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783',
    );
    expect(hex(pbkdf2Sha256(utf8('password'), utf8('salt'), 4096, 32))).toBe('c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a');
  });

  it('agrees with WebCrypto, so accounts work on secure and insecure origins alike', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const password = utf8('Correct-Horse-42 ✓ Привет');
    const key = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);
    const web = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 2000 }, key, 256));
    expect(hex(pbkdf2Sha256(password, salt, 2000))).toBe(hex(web));
  });

  it('derives a production-strength hash in reasonable time', () => {
    const start = performance.now();
    pbkdf2Sha256(utf8('Correct-Horse-42'), utf8('0123456789abcdef'), 210_000);
    const ms = performance.now() - start;
    console.log(`PBKDF2 210k iterations (pure TS): ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(15000);
  });
});
