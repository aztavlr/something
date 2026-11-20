// Tiny synchronous SHA-256 (hex). Constants are derived from prime roots at load time.
const H0 = [], K = [];
(() => {
  const frac = (x) => ((x - Math.floor(x)) * 4294967296) >>> 0;
  let n = 2, found = 0;
  while (found < 64) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (prime) {
      if (found < 8) H0[found] = frac(Math.sqrt(n));
      K[found] = frac(Math.cbrt(n));
      found++;
    }
    n++;
  }
})();

export function sha256(str) {
  const msg = new TextEncoder().encode(str);
  const len = msg.length;
  const buf = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  buf.set(msg);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = len * 8;
  dv.setUint32(buf.length - 4, bits >>> 0);
  dv.setUint32(buf.length - 8, Math.floor(bits / 4294967296));
  const H = H0.slice();
  const W = new Uint32Array(64);
  const rotr = (x, r) => (x >>> r) | (x << (32 - r));
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15], b = W[i - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}
