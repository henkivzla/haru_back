const buckets = new Map();

/**
 * Rate limit en memoria (sin deps extra). Adecuado para cPanel con tráfico moderado.
 * Para clusters multi-nodo usar Redis u otro store compartido.
 */
function rateLimit({ windowMs = 60_000, max = 10, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
      });
    }

    return next();
  };
}

const reportPaymentLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 8,
  keyFn: (req) => `report-pay:${req.user?.tiendaId || req.ip}:${req.user?.id || 'anon'}`,
});

module.exports = { rateLimit, reportPaymentLimiter };
