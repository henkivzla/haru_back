function normalizeFrontendUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/$/, '');
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function originFromReferer(referer) {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin) {
  const allowed = (process.env.ALLOWED_FRONTEND_ORIGINS || '')
    .split(',')
    .map((entry) => normalizeFrontendUrl(entry.trim()))
    .filter(Boolean);

  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}

/**
 * URL base del frontend para enlaces en correos (recuperación, etc.).
 * Prioriza el origen desde el que el usuario abrió la app (body, Origin, Referer).
 */
function resolveFrontendUrl(req) {
  const candidates = [
    req.body?.origin,
    req.body?.frontendUrl,
    req.get('Origin'),
    originFromReferer(req.get('Referer')),
    process.env.FRONTEND_URL,
    'http://localhost:5173',
  ];

  for (const candidate of candidates) {
    const origin = normalizeFrontendUrl(candidate);
    if (origin && isAllowedOrigin(origin)) return origin;
  }

  return normalizeFrontendUrl(process.env.FRONTEND_URL) || 'http://localhost:5173';
}

module.exports = { resolveFrontendUrl, normalizeFrontendUrl };
