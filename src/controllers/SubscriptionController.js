const db = require('../../config/db');
const UserModel = require('../models/UserModel');
const { resolveFeatures } = require('../config/planFeatures');

const PLAN_BY_LABEL = {
  'Plan Económico ($15)': 1,
  'Plan Estándar ($18)': 2,
  'Plan Pro ($22)': 3
};

const PLAN_BY_AMOUNT = {
  15: 1,
  18: 2,
  22: 3
};

const METODO_MAP = {
  'Pago Móvil (Bs)': 'PAGO_MOVIL',
  'Zelle (USD)': 'ZELLE',
  'Transferencia Bancaria': 'TRANSFERENCIA'
};

class SubscriptionController {
  static buildPlanResponse(user, subscription) {
    const role = user.rol;
    const isSuperAdmin = role === 'SUPERADMIN';
    const subscriptionActive = !subscription || ['ACTIVA', 'PRUEBA'].includes(subscription.estado);
    const planSlug = isSuperAdmin ? 'pro' : (subscription?.planSlug || 'economico');
    let features = isSuperAdmin ? resolveFeatures('pro') : resolveFeatures(planSlug);

    if (!isSuperAdmin && subscription && !subscriptionActive) {
      features = ['planes'];
    }

    return {
      planSlug,
      planNombre: subscription?.planNombre || (isSuperAdmin ? 'Plan Pro' : 'Plan Económico'),
      planMonto: subscription?.planMonto || (planSlug === 'pro' ? 22 : planSlug === 'estandar' ? 18 : 15),
      subscriptionEstado: subscription?.estado || (isSuperAdmin ? 'ACTIVA' : 'PRUEBA'),
      proximoPago: subscription?.proximoPago || null,
      maxUsuarios: subscription?.maxUsuarios || (planSlug === 'pro' ? 999 : planSlug === 'estandar' ? 3 : 1),
      features,
      subscriptionActive
    };
  }

  static async getMyPlan(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const subscription = await UserModel.findSubscriptionByTiendaId(user.tienda_id);
      res.json({ success: true, data: SubscriptionController.buildPlanResponse(user, subscription) });
    } catch (err) {
      next(err);
    }
  }

  static resolvePlanId(plan, montoUsd) {
    if (plan && PLAN_BY_LABEL[plan]) return PLAN_BY_LABEL[plan];
    return PLAN_BY_AMOUNT[parseInt(montoUsd, 10)] || 2;
  }

  static async reportPayment(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Usuario sin tienda asociada' });
      }

      const { plan, metodoPago, referencia, montoUsd, bancoEmisor } = req.body;
      if (!referencia || !montoUsd) {
        return res.status(400).json({ success: false, error: 'referencia y montoUsd son requeridos' });
      }

      const planId = SubscriptionController.resolvePlanId(plan, montoUsd);
      const metodo = METODO_MAP[metodoPago] || 'OTRO';

      const [subs] = await db.query(
        `SELECT id FROM suscripciones WHERE tienda_id = ? ORDER BY id DESC LIMIT 1`,
        [tiendaId]
      );

      const [result] = await db.query(
        `INSERT INTO reportes_pago
           (tienda_id, suscripcion_id, plan_id, metodo_pago, referencia, monto_usd, banco_emisor)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tiendaId, subs[0]?.id || null, planId, metodo, referencia, montoUsd, bancoEmisor || null]
      );

      res.status(201).json({
        success: true,
        id: result.insertId,
        message: 'Pago reportado. Será validado por la administración.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SubscriptionController;
