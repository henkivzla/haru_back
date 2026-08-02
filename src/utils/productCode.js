const CODIGO_PREFIX = 'COD-';

function stripCodigoPrefix(value) {
  return String(value || '')
    .trim()
    .replace(/^cod-/i, '')
    .replace(/^ref-/i, '');
}

function normalizeCodigoRef(codigo, fallbackSuffix) {
  const suffix = stripCodigoPrefix(codigo) || String(fallbackSuffix || Date.now());
  return `${CODIGO_PREFIX}${suffix}`;
}

module.exports = {
  CODIGO_PREFIX,
  stripCodigoPrefix,
  normalizeCodigoRef,
};
