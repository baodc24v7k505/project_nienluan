// Read-only connectivity probe: only ADMIN may invoke it. It submits no
// credentials, amount or order to MoMo and cannot create a payment.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed' });
  }
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ message: 'Authentication required' });
  }
  const api = (process.env.VITE_API_URL ?? 'https://ecom-backend-g2m7.onrender.com/api').replace(/\/$/, '');
  try {
    const auth = await fetch(`${api}/auth/me`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!auth.ok) return response.status(401).json({ message: 'Invalid session' });
    const user = await auth.json();
    if (user.role !== 'ADMIN') return response.status(403).json({ message: 'Admin only' });
    const probe = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(35000),
      redirect: 'error',
    });
    let data;
    try { data = await probe.json(); } catch { data = null; }
    return response.status(200).json({
      httpStatus: probe.status,
      server: probe.headers.get('server'),
      contentType: probe.headers.get('content-type'),
      resultCode: typeof data?.resultCode === 'number' ? data.resultCode : null,
    });
  } catch {
    return response.status(503).json({ message: 'Connectivity check unavailable' });
  }
}
