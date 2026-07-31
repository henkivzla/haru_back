const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');

class BcvScraperService {
  /**
   * Obtiene la Tasa Oficial del Banco Central de Venezuela (BCV) directamente desde bcv.org.ve
   */
  static async fetchBcvRate() {
    const agent = new https.Agent({ rejectUnauthorized: false });

    // 1. Método principal: Scraping directo de https://www.bcv.org.ve
    try {
      const response = await axios.get('https://www.bcv.org.ve', {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const usdText = $('#dolar strong').text().trim().replace(',', '.');
      const rate = parseFloat(usdText);

      if (!isNaN(rate) && rate > 0) {
        console.log(`[BCV Scraper] Tasa obtenida con éxito de bcv.org.ve: Bs. ${rate}`);
        return { tasa: rate, fuente: 'bcv.org.ve (Oficial Directo)', fecha: new Date(), success: true };
      }
    } catch (error) {
      console.warn(`[BCV Scraper] Fallo en scraper directo de bcv.org.ve (${error.message}). Intentando API respaldada...`);
    }

    // 2. Método respaldo 1: API pública de tasas oficial de Venezuela (DolarApi)
    try {
      const apiResponse = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial', { timeout: 8000 });
      if (apiResponse.data && apiResponse.data.promedio) {
        const apiRate = parseFloat(apiResponse.data.promedio);
        console.log(`[BCV Scraper] Tasa obtenida de DolarApi BCV: Bs. ${apiRate}`);
        return { tasa: apiRate, fuente: 'BCV Oficial (DolarApi)', fecha: new Date(), success: true };
      }
    } catch (apiError) {
      console.warn(`[BCV Scraper] Fallo en API respaldo: ${apiError.message}`);
    }

    // 3. Fallback si no hay conexión a internet
    return { tasa: 746.63, fuente: 'BCV Cache Local', fecha: new Date(), success: false };
  }
}

module.exports = BcvScraperService;
