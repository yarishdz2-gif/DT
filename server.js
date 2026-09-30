const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PACKS_DIR = path.join(DATA_DIR, 'packs');

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PACKS_DIR, { recursive: true });

app.disable('x-powered-by');
app.use(express.json({ limit: '15mb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

const TOKENS = [
  'PRKQ','VQ7M','X9AZ','TQPX','N8LK','H2WF','R7QD','M4VX',
  'Z8PN','KQ3R','F6TY','B9XW','J5LM','C7VA','P2ZS','W8KD'
];

const HEX = '0123456789ABCDEF';

function encodeQyrex(text, key) {
  const data = Buffer.from(text, 'utf8');
  const keyBytes = Buffer.from(key, 'utf8');
  const tokens = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    const mixed = (data[i] + keyBytes[i % keyBytes.length]) & 0xff;
    const high = (mixed >> 4) & 0x0f;
    const low = mixed & 0x0f;
    tokens[i] = TOKENS[high] + HEX[low];
  }

  return tokens;
}

function splitEven(items, count) {
  const actual = Math.max(1, Math.min(Number(count) || 6, 30));
  const parts = [];
  const base = Math.floor(items.length / actual);
  const extra = items.length % actual;
  let offset = 0;

  for (let i = 0; i < actual; i++) {
    const size = base + (i < extra ? 1 : 0);
    parts.push(items.slice(offset, offset + size));
    offset += size;
  }

  return parts.filter(p => p.length > 0);
}

function safeId() {
  return crypto.randomBytes(9).toString('hex');
}

function publicOrigin(req) {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
}

function packPath(id) {
  return path.join(PACKS_DIR, id);
}

app.post('/api/packs', (req, res) => {
  try {
    const source = typeof req.body?.source === 'string' ? req.body.source : '';
    const key = typeof req.body?.key === 'string' ? req.body.key : '';
    const requestedParts = Number(req.body?.parts) || 6;

    if (!source.trim()) {
      return res.status(400).json({ ok: false, error: 'source_required' });
    }

    if (!key) {
      return res.status(400).json({ ok: false, error: 'key_required' });
    }

    if (Buffer.byteLength(source, 'utf8') > 10 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'source_too_large' });
    }

    const tokens = encodeQyrex(source, key);
    const chunks = splitEven(tokens, requestedParts);
    const id = safeId();
    const dir = packPath(id);
    fs.mkdirSync(dir, { recursive: true });

    chunks.forEach((chunk, index) => {
      const body = `QX4:${chunk.join(' ')}`;
      fs.writeFileSync(path.join(dir, `${String(index + 1).padStart(2, '0')}.txt`), body, 'utf8');
    });

    const origin = publicOrigin(req);
    const links = chunks.map((_, index) => `${origin}/q/${id}/${index + 1}`);

    const meta = {
      id,
      parts: links.length,
      createdAt: new Date().toISOString(),
      links
    };

    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

    res.json({
      ok: true,
      id,
      parts: links.length,
      links,
      base: `${origin}/q/${id}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'pack_create_failed' });
  }
});

app.get('/q/:id/:part', (req, res) => {
  try {
    const id = req.params.id;
    const part = Number(req.params.part);

    if (!/^[a-f0-9]{18}$/.test(id) || !Number.isInteger(part) || part < 1 || part > 30) {
      return res.status(404).send('Not found');
    }

    const file = path.join(packPath(id), `${String(part).padStart(2, '0')}.txt`);

    if (!fs.existsSync(file)) {
      return res.status(404).send('Not found');
    }

    res.type('text/plain').set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(fs.readFileSync(file, 'utf8'));
  } catch {
    res.status(404).send('Not found');
  }
});

app.get('/api/packs/:id', (req, res) => {
  try {
    if (!/^[a-f0-9]{18}$/.test(req.params.id)) {
      return res.status(404).json({ ok: false });
    }

    const file = path.join(packPath(req.params.id), 'meta.json');
    if (!fs.existsSync(file)) {
      return res.status(404).json({ ok: false });
    }

    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    res.status(404).json({ ok: false });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Qyrex running on port ${PORT}`);
});
