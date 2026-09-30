export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const data = url.searchParams.get('d');

    if (!data) {
      return new Response('QYREX: missing data', {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
      });
    }

    return new Response(data, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
        'access-control-allow-origin': '*'
      }
    });
  } catch {
    return new Response('QYREX: bad request', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
}
