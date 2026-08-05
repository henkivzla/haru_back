const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');

function parseBcvNumber(raw) {
  if (!raw) return null;
  const normalized = String(raw).trim().replace(/\s/g, '');
  const value = parseFloat(normalized.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatRate(value) {
  return Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function buildPayload({ tasa, tasaEur, fuente, fecha, success = true }) {
  return {
    tasa,
    tasaEur,
    tasaFormatted: formatRate(tasa),
    tasaEurFormatted: tasaEur ? formatRate(tasaEur) : null,
    fuente,
    fecha,
    success,
  };
}

class BcvScraperService {
  /**
   * Tasas oficiales BCV: USD y EUR en bolívares (sin cálculos cruzados).
   */
  static async fetchBcvRate() {
    const agent = new https.Agent({ rejectUnauthorized: false });

    // 1. Scraping directo bcv.org.ve (#dolar y #euro)
    try {
      const response = await axios.get('https://www.bcv.org.ve', {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const tasa = parseBcvNumber($('#dolar strong').text().trim());
      const tasaEur = parseBcvNumber($('#euro strong').text().trim());

      if (tasa) {
        console.log(`[BCV Scraper] bcv.org.ve → USD Bs. ${tasa}${tasaEur ? ` · EUR Bs. ${tasaEur}` : ''}`);
        return buildPayload({
          tasa,
          tasaEur,
          fuente: 'bcv.org.ve (Oficial Directo)',
          fecha: new Date(),
          success: true,
        });
      }
    } catch (error) {
      console.warn(`[BCV Scraper] Fallo scraper bcv.org.ve (${error.message}). Intentando DolarApi...`);
    }

    // 2. DolarApi — cotizaciones oficiales USD y EUR
    try {
      const apiResponse = await axios.get('https://ve.dolarapi.com/v1/cotizaciones', { timeout: 8000 });
      const rows = Array.isArray(apiResponse.data) ? apiResponse.data : [];
      const usdRow = rows.find((r) => r.moneda === 'USD' && r.fuente === 'oficial');
      const eurRow = rows.find((r) => r.moneda === 'EUR' && r.fuente === 'oficial');
      const tasa = parseBcvNumber(usdRow?.promedio);
      const tasaEur = parseBcvNumber(eurRow?.promedio);

      if (tasa) {
        console.log(`[BCV Scraper] DolarApi → USD Bs. ${tasa}${tasaEur ? ` · EUR Bs. ${tasaEur}` : ''}`);
        return buildPayload({
          tasa,
          tasaEur,
          fuente: 'BCV Oficial (DolarApi)',
          fecha: usdRow?.fechaActualizacion ? new Date(usdRow.fechaActualizacion) : new Date(),
          success: true,
        });
      }
    } catch (apiError) {
      console.warn(`[BCV Scraper] Fallo DolarApi cotizaciones: ${apiError.message}`);
    }

    // 3. Fallback USD solo (legacy) si cotizaciones falla
    try {
      const apiResponse = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial', { timeout: 8000 });
      const tasa = parseBcvNumber(apiResponse.data?.promedio);
      if (tasa) {
        console.log(`[BCV Scraper] DolarApi USD legacy → Bs. ${tasa}`);
        return buildPayload({
          tasa,
          tasaEur: null,
          fuente: 'BCV USD (DolarApi legacy)',
          fecha: new Date(),
          success: true,
        });
      }
    } catch (apiError) {
      console.warn(`[BCV Scraper] Fallo DolarApi legacy: ${apiError.message}`);
    }

    return buildPayload({
      tasa: 746.63,
      tasaEur: null,
      fuente: 'BCV Cache Local',
      fecha: new Date(),
      success: false,
    });
  }
}

module.exports = BcvScraperService;
