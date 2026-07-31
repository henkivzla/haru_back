// Controlador Super-Admin para la gestión del dueño del sistema

class AdminController {
  static async getStores(req, res, next) {
    try {
      const stores = [
        { id: 1, nombre: 'Farmacia La Salud, C.A.', dueno: 'Carlos Mendoza', plan: 'Plan Pro ($22)', monto: 22, estado: 'Activa', proximoPago: '2026-08-25' },
        { id: 2, nombre: 'Bodegón & Licorería El Samán', dueno: 'María Alejandra Gómez', plan: 'Plan Estándar ($18)', monto: 18, estado: 'Activa', proximoPago: '2026-08-10' },
        { id: 3, nombre: 'Inversiones AutoPartes Express', dueno: 'Roberto Silva', plan: 'Plan Económico ($15)', monto: 15, estado: 'Activa', proximoPago: '2027-02-15' },
        { id: 4, nombre: 'Supermercado Los Andes', dueno: 'José Luis Torrealba', plan: 'Plan Estándar ($18)', monto: 18, estado: 'Suspendida', proximoPago: '2026-07-01' }
      ];

      res.json({
        success: true,
        mrrTotal: 55,
        totalActivas: 3,
        stores
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStorePlan(req, res, next) {
    try {
      const { storeId, plan, monto } = req.body;
      res.json({
        success: true,
        message: `Plan del comercio #${storeId} actualizado a ${plan} ($${monto}/mes)`
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleStoreStatus(req, res, next) {
    try {
      const { storeId, estado } = req.body;
      res.json({
        success: true,
        message: `Estado del comercio #${storeId} cambiado a ${estado}`
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
