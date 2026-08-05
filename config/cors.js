/**
 * Orígenes CORS permitidos.
 * Desarrollo: refleja el Origin del cliente (localhost, IP LAN, etc.).
 * Producción: lista explícita desde CORS_ORIGIN (coma-separada).
 */
function parseCorsOrigins(raw) {
  if (!raw || raw.trim() === '*') return true;
  const list = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return list.length ? list : true;
}

function getCorsOptions(nodeEnv = 'development') {
  const credentials = true;

  if (nodeEnv !== 'production') {
    return { origin: true, credentials };
  }

  return {
    origin: parseCorsOrigins(process.env.CORS_ORIGIN),
    credentials,
  };
}

module.exports = { getCorsOptions, parseCorsOrigins };
