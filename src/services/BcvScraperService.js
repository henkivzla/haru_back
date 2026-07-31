const axios = require('axios');
const cheerio = require('cheerio');

class BcvScraperService {
  /**
   * Obtiene la Tasa Oficial del Banco Central de Venezuela (BCV)
   */
  static async fetchBcvRate() {
    try {
      // Intentar scraping del portal del BCV
      const response = await axios.get('https://www.bcv.org.ve', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 5000
      });

      const $ = cheerio.load(response.data);
      const usdText = $('#dolar strong').text().trim().replace(',', '.');
      const rate = parseFloat(usdText);

      if (!isNaN(rate) && rate > 0) {
        return { tasa: rate, fuente: 'BCV Portal Oficial', success: true };
      }
      
      throw new Error('Valor inválido parseado del BCV');
    } catch (error) {
      // Fallback seguro si el sitio del BCV tiene CAPTCHA o timeout
      console.warn('Fallback a Tasa BCV por defecto debido a timeout/protección portal');
      return { tasa: 36.5000, fuente: 'BCV Cache / Fallback API', success: false };
    }
  }
}

module.exports = BcvScraperService;
