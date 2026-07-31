const SaleModel = require('../models/SaleModel');
const CashRegisterModel = require('../models/CashRegisterModel');
const CasheaCalculatorService = require('../services/CasheaCalculatorService');

class SaleController {
  async processSale(req, res, next) {
    try {
      const { clienteNombre, clienteRif, montoUsd, tasaBcv = 36.50, metodoPago, items = [] } = req.body;

      const tiendaId = req.user?.tiendaId || 1;
      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);

      let cajaId = req.body.cajaId || activeCaja?.id || null;
      if (!cajaId) {
        cajaId = await CashRegisterModel.open({
          tiendaId,
          usuarioId: req.user.id,
          montoUsd: 0,
          montoBs: 0,
          desgloseUsd: {},
          desgloseBs: {},
          zelle: 0,
          pagoMovil: 0,
          pos: 0,
          tasaBcv
        });
      }

      const montoBs = montoUsd * tasaBcv;

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
