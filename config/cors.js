/**
 * Orígenes CORS permitidos.
 * Local: refleja el Origin del cliente.
 * Producción: CORS_ORIGIN + subdominios *.henki.com.ve (cPanel).
 */
function parseCorsOrigins(raw) {
  if (!raw || raw.trim() === '*') return null;
  const list = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return list.length ? list : null;
}

function isHenkiSubdomain(origin) {
  return /^https:\/\/[\w-]+\.henki\.com\.ve$/i.test(origin || '');
}

function getCorsOptions(nodeEnv = 'development') {
  const credentials = true;

  if (nodeEnv !== 'production') {
    return { origin: true, credentials };
  }

  const explicit = parseCorsOrigins(process.env.CORS_ORIGIN);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (explicit?.includes(origin)) return callback(null, true);
      if (isHenkiSubdomain(origin)) return callback(null, true);
      callback(new Error(`CORS bloqueado: ${origin}`));
    },
    credentials,
  };
}

module.exports = { getCorsOptions, parseCorsOrigins, isHenkiSubdomain };
