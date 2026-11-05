// Pixel size of an image from its first bytes (PNG, JPEG, GIF, WebP, AVIF,
// SVG). Used to check share images and oversized photos without decoding
// anything. No dependencies.

const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u32be = (b, o) => b.readUInt32BE(o);
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);

function png(b) {
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') return null;
  return { type: 'png', width: u32be(b, 16), height: u32be(b, 20) };
}

function gif(b) {
  if (b.length < 10 || b.toString('latin1', 0, 3) !== 'GIF') return null;
  return { type: 'gif', width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function jpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const marker = b[o + 1];
    // SOF0..SOF15 carry the frame size, except DHT (C4), JPG (C8), DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { type: 'jpeg', width: u16be(b, o + 7), height: u16be(b, o + 5) };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      o += 2;
      continue;
    }
    o += 2 + u16be(b, o + 2);
  }
  return { type: 'jpeg', width: null, height: null };
}

function webp(b) {
  if (b.length < 30 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('latin1', 12, 16);
  if (chunk === 'VP8X') return { type: 'webp', width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  if (chunk === 'VP8 ') return { type: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { type: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { type: 'webp', width: null, height: null };
}

function avif(b) {
  if (b.length < 16 || b.toString('latin1', 4, 8) !== 'ftyp') return null;
  const brand = b.toString('latin1', 8, 12);
  if (!['avif', 'avis', 'mif1', 'heic', 'heix'].includes(brand)) return null;
  // The image size lives in an "ispe" box: 4 bytes version/flags, width, height.
  const at = b.indexOf('ispe', 0, 'latin1');
  if (at === -1 || at + 16 > b.length) return { type: brand.startsWith('hei') ? 'heic' : 'avif', width: null, height: null };
  return { type: brand.startsWith('hei') ? 'heic' : 'avif', width: u32be(b, at + 8), height: u32be(b, at + 12) };
}

function svg(b) {
  const head = b.toString('utf8', 0, Math.min(b.length, 2048));
  if (!/<svg[\s>]/i.test(head)) return null;
  const num = (name) => {
    const m = new RegExp(`\\s${name}=["']([\\d.]+)(px)?["']`, 'i').exec(head);
    return m ? Math.round(Number(m[1])) : null;
  };
  let width = num('width');
  let height = num('height');
  const vb = /viewBox=["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(head);
  if (vb && (width == null || height == null)) {
    width = width ?? Math.round(Number(vb[1]));
    height = height ?? Math.round(Number(vb[2]));
  }
  return { type: 'svg', width, height };
}

// → { type, width, height } or null when the bytes are not a known image.
export function imageSize(buffer) {
  if (!buffer || !buffer.length) return null;
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return png(b) || gif(b) || jpeg(b) || webp(b) || avif(b) || svg(b);
}

export function typeFromContentType(contentType) {
  const m = /^image\/([a-z0-9.+-]+)/i.exec(String(contentType || ''));
  if (!m) return null;
  const t = m[1].toLowerCase();
  return t === 'jpg' ? 'jpeg' : t === 'svg+xml' ? 'svg' : t;
}
