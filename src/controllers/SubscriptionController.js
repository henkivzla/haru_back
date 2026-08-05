const db = require('../../config/db');
const UserModel = require('../models/UserModel');
const { issueAuthToken } = require('./authPayload');
const { sendPaymentReportNotification } = require('../services/EmailService');
const { sendPaymentReportWhatsApp } = require('../services/WhatsAppService');
const {
  validateReportPayload,
  findPendingDuplicate,
  findPendingReportByTienda,
  listReportsByTienda,
  createPaymentReport,
  resolveTiendaForPayment,
} = require('../services/subscriptionPaymentService');
const { refreshSubscriptionForStore } = require('../services/subscriptionLifecycleService');

class SubscriptionController {
  static async getMyPlan(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const tiendaResolved = await resolveTiendaForPayment(db, user.id);
      const tiendaId = tiendaResolved.ok ? tiendaResolved.tiendaId : user.tienda_id;

      const subscription = tiendaId
        ? await refreshSubscriptionForStore(db, tiendaId)
        : null;
      const pendingPayment = tiendaId
        ? await findPendingReportByTienda(db, tiendaId)
        : null;
      const { token, user: planData } = issueAuthToken(user, subscription, { pendingPayment });

      res.json({
        success: true,
        data: { ...planData, pendingPayment },
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyPaymentReports(req, res, next) {
    try {
      const tiendaResolved = await resolveTiendaForPayment(db, req.user.id);
      if (!tiendaResolved.ok) {
        return res.status(tiendaResolved.status).json({
          success: false,
          error: tiendaResolved.error,
        });
      }

      const reports = await listReportsByTienda(db, tiendaResolved.tiendaId);
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  static async reportPayment(req, res, next) {
    try {
      const tiendaResolved = await resolveTiendaForPayment(db, req.user.id);
      if (!tiendaResolved.ok) {
        return res.status(tiendaResolved.status).json({
          success: false,
          error: tiendaResolved.error,
        });
      }
      const tiendaId = tiendaResolved.tiendaId;

      const validation = validateReportPayload(req.body);
      if (!validation.ok) {
        return res.status(validation.status).json({ success: false, error: validation.error });
      }

      const { data } = validation;

      const duplicate = await findPendingDuplicate(db, tiendaId, data.referencia);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un reporte pendiente con esa referencia',
        });
      }

      const [subs] = await db.query(
        `SELECT id FROM suscripciones WHERE tienda_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
        [tiendaId]
      );

      const reportId = await createPaymentReport(db, {
        tiendaId,
        suscripcionId: subs[0]?.id || null,
        ...data,
      });

      const pendingPayment = await findPendingReportByTienda(db, tiendaId);

      const [contextRows] = await db.query(
        `SELECT t.nombre AS tiendaNombre,
                pl.nombre AS planNombre,
                u.nombre AS userName,
                u.email AS userEmail
         FROM tiendas t
         JOIN planes pl ON pl.id = ?
         JOIN usuarios u ON u.id = ?
         WHERE t.id = ?
         LIMIT 1`,
        [data.planId, req.user.id, tiendaId]
      );
      const ctx = contextRows[0] || {};

      sendPaymentReportNotification({
        reportId,
        storeName: ctx.tiendaNombre,
        userName: ctx.userName,
        userEmail: ctx.userEmail,
        planLabel: req.body.plan || ctx.planNombre,
        metodoPago: req.body.metodoPago,
        referencia: data.referencia,
        montoUsd: data.montoUsd,
        bancoEmisor: data.bancoEmisor,
      }).catch((emailErr) => {
        console.error('[haru Email] Error al notificar reporte de pago:', emailErr.message);
      });

      sendPaymentReportWhatsApp({
        reportId,
        storeName: ctx.tiendaNombre,
        userName: ctx.userName,
        planLabel: req.body.plan || ctx.planNombre,
        metodoPago: req.body.metodoPago,
        referencia: data.referencia,
        montoUsd: data.montoUsd,
      }).catch((waErr) => {
        console.error('[haru WhatsApp] Error al notificar reporte de pago:', waErr.message);
      });

      res.status(201).json({
        success: true,
        id: reportId,
        pendingPayment,
        message: 'Pago reportado. Será validado por la administración.',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SubscriptionController;
