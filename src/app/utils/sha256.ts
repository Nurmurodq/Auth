/*
 * SHA-256, HMAC-SHA-256 and PBKDF2-HMAC-SHA-256 in plain TypeScript.
 *
 * Browsers only expose WebCrypto (crypto.subtle) on secure origins (HTTPS or localhost). When Folio
 * is opened over plain HTTP — e.g. from a phone on the local network — on-device accounts fall back
 * to this implementation. It produces exactly the same output as WebCrypto, so accounts created on
 * either kind of origin keep working on the other.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
  0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
  0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
  0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

const W = new Uint32Array(64);

/** Processes one 64-byte block (from `words`, big-endian 32-bit) into `state`. */
function compress(state: Uint32Array, words: Uint32Array): void {
  for (let i = 0; i < 16; i++) W[i] = words[i];
  for (let i = 16; i < 64; i++) {
    const a = W[i - 15];
    const b = W[i - 2];
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
  }
  let a = state[0], b = state[1], c = state[2], d = state[3], e = state[4], f = state[5], g = state[6], h = state[7];
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
    h = g;
    g = f;
    f = e;
    e = (d + t1) | 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) | 0;
  }
  state[0] += a;
  state[1] += b;
  state[2] += c;
  state[3] += d;
  state[4] += e;
  state[5] += f;
  state[6] += g;
  state[7] += h;
}

/** Hashes `data`, continuing from `start` (a state after `prefixLength` bytes already hashed). */
function digestFrom(start: ArrayLike<number>, prefixLength: number, data: Uint8Array): Uint8Array {
  const state = new Uint32Array(start);
  const total = prefixLength + data.length;
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((total * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (total * 8) >>> 0);
  const words = new Uint32Array(16);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(off + i * 4);
    compress(state, words);
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, state[i]);
  return out;
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  return digestFrom(H0, 0, data);
}

/** State after hashing one 64-byte block (used to precompute HMAC's inner and outer pads). */
function stateAfterBlock(block: Uint8Array): Uint32Array {
  const state = new Uint32Array(H0);
  const view = new DataView(block.buffer, block.byteOffset, 64);
  const words = new Uint32Array(16);
  for (let i = 0; i < 16; i++) words[i] = view.getUint32(i * 4);
  compress(state, words);
  return state;
}

function hmacStates(key: Uint8Array): { inner: Uint32Array; outer: Uint32Array } {
  const k = new Uint8Array(64);
  k.set(key.length > 64 ? sha256Bytes(key) : key);
  const ipad = k.map((b) => b ^ 0x36);
  const opad = k.map((b) => b ^ 0x5c);
  return { inner: stateAfterBlock(ipad), outer: stateAfterBlock(opad) };
}

export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const { inner, outer } = hmacStates(key);
  return digestFrom(outer, 64, digestFrom(inner, 64, data));
}

/** PBKDF2-HMAC-SHA-256, identical to WebCrypto's deriveBits({ name: 'PBKDF2', hash: 'SHA-256' }). */
export function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number, length = 32): Uint8Array {
  const { inner, outer } = hmacStates(password);
  const out = new Uint8Array(length);
  const blockInput = new Uint8Array(salt.length + 4);
  blockInput.set(salt);
  for (let block = 1, pos = 0; pos < length; block++, pos += 32) {
    new DataView(blockInput.buffer).setUint32(salt.length, block);
    let u = digestFrom(outer, 64, digestFrom(inner, 64, blockInput));
    const t = u.slice();
    for (let i = 1; i < iterations; i++) {
      u = digestFrom(outer, 64, digestFrom(inner, 64, u));
      for (let j = 0; j < 32; j++) t[j] ^= u[j];
    }
    out.set(t.subarray(0, Math.min(32, length - pos)), pos);
  }
  return out;
}
