const AccountPayableModel = require('../models/AccountPayableModel');
const DifferentialExchangeService = require('../services/DifferentialExchangeService');

class AccountPayableController {
  async getAccounts(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const currentBcvRate = parseFloat(req.query.tasaBcv || 36.50);

      const accounts = await AccountPayableModel.findPendingByStore(tiendaId);

      const formatted = accounts.map(acc => {
        const diff = DifferentialExchangeService.calculateGainLoss({
          montoUsd: parseFloat(acc.monto_usd),
          tasaOrigen: parseFloat(acc.tasa_origen || 36.00),
          tasaActualBcv: currentBcvRate
        });

        return {
          id: acc.id,
          proveedor: acc.proveedor,
          producto: acc.producto,
          montoUsd: parseFloat(acc.monto_usd),
          tasaOrigen: parseFloat(acc.tasa_origen || 36),
          fechaVencimiento: acc.fecha_vencimiento,
          estado: acc.estado,
          diferencialCambiario: diff
        };
      });

      return res.json({ success: true, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async payAccount(req, res, next) {
    try {
      const { id } = req.params;
      await AccountPayableModel.markAsPaid(id);
      return res.json({ success: true, message: 'Cuenta marcada como pagada' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccountPayableController();
