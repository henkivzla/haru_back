const SaleModel = require('../models/SaleModel');
const CashRegisterModel = require('../models/CashRegisterModel');
const CasheaCalculatorService = require('../services/CasheaCalculatorService');

class SaleController {
  async processSale(req, res, next) {
    try {
      const { montoUsd, tasaBcv = 36.50, metodoPago, items = [], cliente = null } = req.body;
      const tiendaId = req.user?.tiendaId;

      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Tienda no identificada para esta venta.' });
      }

      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      const cajaId = req.body.cajaId || activeCaja?.id || null;

      if (!cajaId) {
        return res.status(400).json({
          success: false,
          error: 'Primero abre la caja del día para registrar ventas.',
        });
      }

      const montoBs = montoUsd * tasaBcv;

      const ventaId = await SaleModel.createVenta({
        cajaId,
        tiendaId,
        cliente,
        montoUsd,
        montoBs,
        tasaBcv,
        metodoPago,
        items
      });

      return res.status(201).json({
        success: true,
        message: 'Venta registrada y Nota de Entrega emitida',
        ventaId,
        montoUsd,
        montoBs
      });
    } catch (error) {
      next(error);
    }
  }

  async simulateCashea(req, res, next) {
    try {
      const { totalUsd = 120, tasaBcv = 36.50 } = req.query;

      const result = CasheaCalculatorService.calculateInstallments({
        totalUsd: parseFloat(totalUsd),
        tasaBcv: parseFloat(tasaBcv)
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SaleController();
