const SaleModel = require('../models/SaleModel');
const CasheaCalculatorService = require('../services/CasheaCalculatorService');

class SaleController {
  async processSale(req, res, next) {
    try {
      const { clienteNombre, clienteRif, montoUsd, tasaBcv = 36.50, metodoPago, items = [] } = req.body;

      const montoBs = montoUsd * tasaBcv;
      const cajaId = req.body.cajaId || 1;

      const ventaId = await SaleModel.createVenta({
        cajaId,
        clienteNombre: clienteNombre || 'Cliente General',
        clienteRif: clienteRif || 'V-00000000-0',
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
