const SaleModel = require('../models/SaleModel');
const CashRegisterModel = require('../models/CashRegisterModel');
const CasheaCalculatorService = require('../services/CasheaCalculatorService');
const { getModoVentas } = require('../services/tiendaSettingsService');

class SaleController {
  async processSale(req, res, next) {
    try {
      const { montoUsd, tasaBcv = 36.50, metodoPago, items = [], cliente = null } = req.body;
      const tiendaId = req.user?.tiendaId;

      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Tienda no identificada para esta venta.' });
      }

      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      let cajaId = req.body.cajaId || activeCaja?.id || null;

      if (!cajaId) {
        const modoVentas = await getModoVentas(tiendaId);
        if (modoVentas === 'directo') {
          cajaId = await CashRegisterModel.ensureOpenForDirectMode({
            tiendaId,
            usuarioId: req.user.id,
            tasaBcv: Number(tasaBcv) || 746.63,
          });
        }
      }

      if (!cajaId) {
        return res.status(400).json({
          success: false,
          error: 'Primero abre la caja del día para registrar ventas.',
        });
      }

      const montoBs = montoUsd * tasaBcv;

      const normalizedItems = (Array.isArray(items) ? items : []).map((item) => ({
        productoId: SaleModel.parseProductoId(item),
        nombre: item?.nombre || 'Producto',
        precioUsd: Number(item?.precioUsd ?? item?.precio_usd ?? 0),
        cantidad: Math.max(1, parseInt(item?.cantidad ?? item?.qty ?? 1, 10) || 1),
      }));

      const ventaId = await SaleModel.createVenta({
        cajaId,
        tiendaId,
        cliente,
        montoUsd,
        montoBs,
        tasaBcv,
        metodoPago,
        items: normalizedItems,
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

  async listVentasTurno(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Tienda no identificada.' });
      }

      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      const soloAnuladas = String(req.query.estado || 'activas').toLowerCase() === 'anuladas';
      let ventas = [];
      let scope = 'hoy';

      if (activeCaja?.id) {
        ventas = await SaleModel.listByCaja(activeCaja.id, tiendaId, { anulada: soloAnuladas ? 1 : 0 });
        scope = 'turno';
      } else {
        ventas = await SaleModel.listTodayByTienda(tiendaId, { anulada: soloAnuladas ? 1 : 0 });
      }

      const totalUsd = ventas.reduce((acc, v) => acc + Number(v.montoUsd || 0), 0);

      return res.json({
        success: true,
        data: ventas,
        resumen: {
          cantidad: ventas.length,
          totalUsd,
        },
        cajaAbierta: Boolean(activeCaja?.id),
        scope,
        estado: soloAnuladas ? 'anuladas' : 'activas',
      });
    } catch (error) {
      next(error);
    }
  }

  async annulVenta(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const ventaId = parseInt(req.params.id, 10);

      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Tienda no identificada.' });
      }
      if (!ventaId) {
        return res.status(400).json({ success: false, error: 'Venta no válida.' });
      }

      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      if (!activeCaja?.id) {
        return res.status(400).json({
          success: false,
          error: 'Abre la caja para anular ventas del turno actual.',
        });
      }

      await SaleModel.annulVenta({
        ventaId,
        tiendaId,
        usuarioId: req.user.id,
        cajaId: activeCaja.id,
      });

      return res.json({
        success: true,
        message: 'Venta anulada correctamente.',
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ success: false, error: error.message });
      }
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
