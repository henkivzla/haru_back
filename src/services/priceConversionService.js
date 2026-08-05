const BcvScraperService = require('./BcvScraperService');

const VALID_CURRENCIES = new Set(['USD', 'VES', 'EUR']);

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function round4(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

function parseAmount(value) {
  if (value === '' || value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : NaN;
}

function currencyLabel(currency) {
  if (currency === 'VES') return 'Bs.';
  if (currency === 'EUR') return 'EUR';
  return 'USD';
}

/**
 * Convierte un monto ingresado en USD/VES/EUR a canonical USD + snapshots Bs/EUR del día.
 */
function convertPriceEntry({ monedaEntrada, precioEntrada, tasaUsd, tasaEur }) {
  const currency = String(monedaEntrada || 'USD').toUpperCase();
  if (!VALID_CURRENCIES.has(currency)) {
    throw new Error('Moneda de precio no soportada');
  }

  const amount = parseAmount(precioEntrada);
  if (amount == null || Number.isNaN(amount)) {
    throw new Error(`El precio en ${currencyLabel(currency)} debe ser un número válido`);
  }
  if (amount <= 0) {
    throw new Error(`El precio en ${currencyLabel(currency)} debe ser mayor a 0`);
  }

  const usdRate = Number(tasaUsd);
  const eurRate = Number(tasaEur);

  let precioUsd;
  let precioBs;
  let precioEur;

  if (currency === 'USD') {
    precioUsd = amount;
    precioBs = usdRate > 0 ? amount * usdRate : null;
    precioEur = usdRate > 0 && eurRate > 0 ? (amount * usdRate) / eurRate : null;
  } else if (currency === 'VES') {
    if (!(usdRate > 0)) throw new Error('No se pudo obtener la tasa BCV del día');
    precioBs = amount;
    precioUsd = amount / usdRate;
    precioEur = eurRate > 0 ? amount / eurRate : null;
  } else {
    if (!(usdRate > 0 && eurRate > 0)) {
      throw new Error('No se pudieron obtener las tasas BCV del día');
    }
    precioEur = amount;
    precioBs = amount * eurRate;
    precioUsd = precioBs / usdRate;
  }

  return {
    monedaEntrada: currency,
    precioEntrada: round2(amount),
    precioUsd: round2(precioUsd),
    precioBsSnapshot: precioBs != null ? round2(precioBs) : null,
    precioEurSnapshot: precioEur != null ? round2(precioEur) : null,
    tasaBcvSnapshot: usdRate > 0 ? round4(usdRate) : null,
    tasaEurSnapshot: eurRate > 0 ? round4(eurRate) : null,
  };
}

async function resolvePriceFromRequest(body) {
  const { monedaEntrada, precioEntrada, precioUsd } = body || {};
  const entryAmount = parseAmount(precioEntrada);
  const legacyUsd = parseAmount(precioUsd);
  const hasEntry = monedaEntrada != null && monedaEntrada !== '' || entryAmount != null;

  if (hasEntry) {
    const bcv = await BcvScraperService.fetchBcvRate();
    return convertPriceEntry({
      monedaEntrada: monedaEntrada || 'USD',
      precioEntrada: entryAmount ?? legacyUsd,
      tasaUsd: bcv.tasa,
      tasaEur: bcv.tasaEur,
    });
  }

  if (legacyUsd != null) {
    const bcv = await BcvScraperService.fetchBcvRate();
    return convertPriceEntry({
      monedaEntrada: 'USD',
      precioEntrada: legacyUsd,
      tasaUsd: bcv.tasa,
      tasaEur: bcv.tasaEur,
    });
  }

  throw new Error('El precio es requerido');
}

module.exports = {
  VALID_CURRENCIES,
  convertPriceEntry,
  resolvePriceFromRequest,
};
