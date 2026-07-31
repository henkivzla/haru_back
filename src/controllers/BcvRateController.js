const BcvScraperService = require('../services/BcvScraperService');

class BcvRateController {
  async getRate(req, res, next) {
    try {
      const result = await BcvScraperService.fetchBcvRate();
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BcvRateController();
