const { put } = require('@vercel/blob');
const crypto = require('crypto');

const TOKENS = [
  'PRKQ','VQ7M','X9AZ','TQPX','N8LK','H2WF','R7QD','M4VX',
  'Z8PN','KQ3R','F6TY','B9XW','J5LM','C7VA','P2ZS','W8KD'
];
const HEX = '0123456789ABCDEF';

function encodeQyrex(text, key) {
  const data = Buffer.from(text, 'utf8');
  const keyBytes = Buffer.from(key, 'utf8');
  if (!keyBytes.length) throw new Error('key_required');
  const out = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const mixed = (data[i] + keyBytes[i % keyBytes.length]) & 255;
    out[i] = `QX4:${TOKENS[(mixed >> 4) & 15]}${HEX[mixed & 15]}`;
  }
  return out.join(' ');
}

function splitEven(text, count) {
  const cleanCount = Math.max(1, Math.min(Number(count) || 6, 30));
  const tokens = text.split(/\s+/).filter(Boolean);
  const actual = Math.min(cleanCount, Math.max(1, tokens.length));
  const base = Math.floor(tokens.length / actual);
  const extra = tokens.length % actual;
  const parts = [];
  let offset = 0;
  for (let i = 0; i < actual; i++) {
    const size = base + (i < extra ? 1 : 0);
    parts.push(tokens.slice(offset, offset + size).join(' '));
    offset += size;
  }
  return parts;
}

function b64url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const source = typeof body.source === 'string' ? body.source : '';
    const key = typeof body.key === 'string' ? body.key : '';
    const partsCount = Number(body.parts) || 6;
    const origin = typeof body.origin === 'string' && body.origin.trim()
      ? body.origin.trim().replace(/\/$/, '')
      : `https://${req.headers.host}`;

    if (!source.trim()) return res.status(400).json({ ok: false, error: 'source_required' });
    if (!key) return res.status(400).json({ ok: false, error: 'key_required' });
    if (Buffer.byteLength(source, 'utf8') > 4 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'source_over_request_limit', message: 'Mantén el código por debajo de 4 MB para esta función.' });
    }

    const encoded = encodeQyrex(source, key);
    const chunks = splitEven(encoded, partsCount);
    const packId = crypto.randomBytes(12).toString('hex');
    const links = [];

    for (let i = 0; i < chunks.length; i++) {
      const pathname = `qyrex/${packId}/${String(i + 1).padStart(2, '0')}.qyx`;
      const blob = await put(pathname, `QX4:${chunks[i]}`, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'text/plain; charset=utf-8'
      });

      links.push(`${origin}/api/q?u=${b64url(blob.url)}`);
    }

    const qyrexParts = chunks.map((part) => `QX4:${part}`);

    return res.status(200).json({
      ok: true,
      id: packId,
      parts: links.length,
      links,
      qyrexParts,
      qyrex: qyrexParts.join('\n'),
      bytes: Buffer.byteLength(source, 'utf8')
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: 'pack_create_failed',
      message: error && error.message ? error.message : 'unknown_error'
    });
  }
};
