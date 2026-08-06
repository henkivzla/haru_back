/**
 * Orígenes CORS permitidos.
 * Local: refleja el Origin del cliente.
 * cPanel DEV (haru-api-dev): origin true — evita mismatches http/https.
 * PRO: CORS_ORIGIN + subdominios *.henki.com.ve.
 */
function parseCorsOrigins(raw) {
  if (!raw || raw.trim() === '*') return null;
  const list = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return list.length ? list : null;
}

function isHenkiSubdomain(origin) {
  return /^https?:\/\/[\w-]+\.henki\.com\.ve$/i.test(origin || '');
}

function isDevApiHost() {
  const api = process.env.API_PUBLIC_URL || '';
  return api.includes('haru-api-dev');
}

function getCorsOptions(nodeEnv = 'development') {
  const credentials = true;

  if (nodeEnv !== 'production') {
    return { origin: true, credentials };
  }

  if (isDevApiHost()) {
    return { origin: true, credentials };
  }

  const explicit = parseCorsOrigins(process.env.CORS_ORIGIN);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (explicit?.includes(origin)) return callback(null, true);
      if (isHenkiSubdomain(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials,
  };
}

module.exports = { getCorsOptions, parseCorsOrigins, isHenkiSubdomain, isDevApiHost };
