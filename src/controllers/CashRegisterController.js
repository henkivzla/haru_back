const CashRegisterModel = require('../models/CashRegisterModel');

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function computeEurFromUsd(usd, tasaBcv, tasaEur) {
  const bcv = Number(tasaBcv);
  const eur = Number(tasaEur);
  if (!(bcv > 0 && eur > 0)) return null;
  return round2((Number(usd) * bcv) / eur);
}

class CashRegisterController {
  async getStatus(req, res, next) {
    try {
      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      return res.json({
        success: true,
        isOpen: !!activeCaja,
        caja: activeCaja,
      });
    } catch (error) {
      next(error);
    }
  }

  async getResumenActiva(req, res, next) {
    try {
      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      if (!activeCaja) {
        return res.status(400).json({ success: false, error: 'No hay caja abierta' });
      }

      const ventas = await CashRegisterModel.getVentasSummary(activeCaja.id);
      const tasaBcv = Number(req.query.tasaBcv) || Number(activeCaja.tasaBcvApertura) || 0;
      const tasaEur = Number(req.query.tasaEur) || Number(activeCaja.tasaEurApertura) || 0;

      return res.json({
        success: true,
        data: {
          caja: activeCaja,
          ventas: {
            ...ventas,
            totalEur: computeEurFromUsd(ventas.totalUsd, tasaBcv, tasaEur),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async openCaja(req, res, next) {
    try {
      const {
        montoUsd = 0,
        montoBs = 0,
        montoEur = 0,
        desgloseUsd = {},
        desgloseBs = {},
        desgloseEur = {},
        zelle = 0,
        pagoMovil = 0,
        pos = 0,
        tasaBcv = 746.63,
        tasaEur = null,
      } = req.body;
      const tiendaId = req.user.tiendaId || 1;

      const cajaId = await CashRegisterModel.open({
        tiendaId,
        usuarioId: req.user.id,
        montoUsd,
        montoBs,
        montoEur,
        desgloseUsd,
        desgloseBs,
        desgloseEur,
        zelle,
        pagoMovil,
        pos,
        tasaBcv,
        tasaEur,
      });

      return res.status(201).json({
        success: true,
        message: 'Caja aperturada exitosamente',
        cajaId,
      });
    } catch (error) {
      if (error.message?.includes('Ya tienes')) {
        return res.status(409).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  async closeCaja(req, res, next) {
    try {
      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      if (!activeCaja) {
        return res.status(400).json({ success: false, error: 'No hay ninguna caja abierta' });
      }

      const {
        montoCierreUsd = 0,
        montoCierreBs = 0,
        montoCierreEur = 0,
        desgloseCierreUsd = {},
        desgloseCierreBs = {},
        desgloseCierreEur = {},
        tasaBcvCierre,
        tasaEurCierre,
        notasCierre,
      } = req.body;

      const ventas = await CashRegisterModel.getVentasSummary(activeCaja.id);
      const bcv = Number(tasaBcvCierre) || Number(activeCaja.tasaBcvApertura) || 0;
      const eur = Number(tasaEurCierre) || Number(activeCaja.tasaEurApertura) || 0;
      const ventasTotalEur = computeEurFromUsd(ventas.totalUsd, bcv, eur);

      const closed = await CashRegisterModel.close(activeCaja.id, {
        montoCierreUsd: round2(montoCierreUsd),
        montoCierreBs: round2(montoCierreBs),
        montoCierreEur: round2(montoCierreEur),
        desgloseCierreUsd,
        desgloseCierreBs,
        desgloseCierreEur,
        ventasTotalUsd: round2(ventas.totalUsd),
        ventasTotalBs: round2(ventas.totalBs),
        ventasTotalEur: ventasTotalEur,
        ventasCantidad: ventas.cantidad,
        tasaBcvCierre: bcv || null,
        tasaEurCierre: eur || null,
        cerradoPorId: req.user.id,
        notasCierre,
      });

      if (!closed) {
        return res.status(409).json({ success: false, error: 'La caja ya fue cerrada' });
      }

      return res.json({
        success: true,
        message: 'Caja cerrada. El registro quedó guardado en el historial.',
        cajaId: activeCaja.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async listHistorial(req, res, next) {
    try {
      const tiendaId = req.user.tiendaId;
      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Tienda no identificada' });
      }

      const { fecha, limit } = req.query;
      const rows = await CashRegisterModel.listHistorial(tiendaId, { fecha: fecha || null, limit });

      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async getHistorialDetalle(req, res, next) {
    try {
      const tiendaId = req.user.tiendaId;
      const id = parseInt(req.params.id, 10);
      if (!tiendaId || !id) {
        return res.status(400).json({ success: false, error: 'Solicitud inválida' });
      }

      const detail = await CashRegisterModel.getCierreById(id, tiendaId);
      if (!detail) {
        return res.status(404).json({ success: false, error: 'Cierre de caja no encontrado' });
      }

      return res.json({ success: true, data: detail });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CashRegisterController();
