/** Log de peticiones HTTP — solo útil en local (npm run dev) */
module.exports = function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const time = new Date().toLocaleTimeString('es-VE');
    const line = `[${time}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`;

    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.log(line);
  });

  next();
};
