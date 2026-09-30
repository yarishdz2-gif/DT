const { URL } = require('url');

function decodeB64url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  try {
    const u = req.query && req.query.u;
    if (typeof u !== 'string' || !u) return res.status(400).send('Missing u');

    const target = decodeB64url(u);
    const parsed = new URL(target);

    if (parsed.protocol !== 'https:') return res.status(400).send('Invalid target');
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
      return res.status(400).send('Invalid storage target');
    }

    const upstream = await fetch(parsed.toString(), {
      headers: { 'Accept': 'text/plain' }
    });

    if (!upstream.ok) return res.status(upstream.status).send('Not Found');

    const text = await upstream.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(text);
  } catch (error) {
    console.error(error);
    return res.status(400).send('Invalid link');
  }
};
