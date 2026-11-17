// Read-only connectivity probe: only ADMIN may invoke it. It submits no
// credentials, amount or order to MoMo and cannot create a payment.
export const config = { runtime: 'edge' };

export default async function handler(request) {
  const json = (body, status = 200, headers = {}) => Response.json(body, {
    status, headers: { 'Cache-Control': 'no-store', ...headers },
  });
  if (request.method !== 'POST') {
    return json({ message: 'Method not allowed' }, 405, { Allow: 'POST' });
  }
  const authorization = request.headers.get('authorization');
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return json({ message: 'Authentication required' }, 401);
  }
  const api = (process.env.VITE_API_URL ?? 'https://ecom-backend-g2m7.onrender.com/api').replace(/\/$/, '');
  let stage = 'authentication';
  try {
    const auth = await fetch(`${api}/auth/me`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!auth.ok) return json({ message: 'Invalid session' }, 401);
    const user = await auth.json();
    if (user.role !== 'ADMIN') return json({ message: 'Admin only' }, 403);
    stage = 'gateway';
    const probe = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    let data;
    try { data = await probe.json(); } catch { data = null; }
    return json({
      httpStatus: probe.status,
      server: probe.headers.get('server'),
      contentType: probe.headers.get('content-type'),
      resultCode: typeof data?.resultCode === 'number' ? data.resultCode : null,
    });
  } catch (error) {
    return json({
      message: 'Connectivity check unavailable', stage,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      supportsTimeout: typeof AbortSignal.timeout === 'function',
    }, 503);
  }
}
