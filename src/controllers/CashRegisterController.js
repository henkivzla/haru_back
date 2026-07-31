const CashRegisterModel = require('../models/CashRegisterModel');

class CashRegisterController {
  async getStatus(req, res, next) {
    try {
      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      return res.json({
        success: true,
        isOpen: !!activeCaja,
        caja: activeCaja
      });
    } catch (error) {
      next(error);
    }
  }

  async openCaja(req, res, next) {
    try {
      const { montoUsd = 0, montoBs = 0, zelle = 0, pagoMovil = 0, pos = 0, tasaBcv = 36.50 } = req.body;
      const tiendaId = req.user.tiendaId || 1;

      const cajaId = await CashRegisterModel.open({
        tiendaId,
        usuarioId: req.user.id,
        montoUsd,
        montoBs,
        zelle,
        pagoMovil,
        pos,
        tasaBcv
      });

      return res.status(201).json({
        success: true,
        message: 'Caja aperturada exitosamente',
        cajaId
      });
    } catch (error) {
      next(error);
    }
  }

  async closeCaja(req, res, next) {
    try {
      const activeCaja = await CashRegisterModel.findActiveByUser(req.user.id);
      if (!activeCaja) {
        return res.status(400).json({ success: false, error: 'No hay ninguna caja abierta' });
      }

      await CashRegisterModel.close(activeCaja.id);
      return res.json({ success: true, message: 'Caja cerrada exitosamente' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CashRegisterController();
