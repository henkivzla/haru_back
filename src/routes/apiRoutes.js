const express = require('express');
const router = express.Router();

const { verifyToken, checkRole, checkFeature, checkSubscriptionActive } = require('../middlewares/authMiddleware');
const requireAdminReauth = require('../middlewares/requireAdminReauth');
const AuthController = require('../controllers/AuthController');
const CashRegisterController = require('../controllers/CashRegisterController');
const SaleController = require('../controllers/SaleController');
const BcvRateController = require('../controllers/BcvRateController');
const AccountPayableController = require('../controllers/AccountPayableController');
const AdminController = require('../controllers/AdminController');
const SubscriptionController = require('../controllers/SubscriptionController');
const PasswordResetController = require('../controllers/PasswordResetController');
const RegisterController = require('../controllers/RegisterController');
const UserController = require('../controllers/UserController');
const ClienteController = require('../controllers/ClienteController');
const GastoController = require('../controllers/GastoController');
const SucursalController = require('../controllers/SucursalController');
const ReportController = require('../controllers/ReportController');
const TeamController = require('../controllers/TeamController');
const { reportPaymentLimiter } = require('../middlewares/rateLimit');

const adminOnly = checkRole(['ADMIN', 'SUPERADMIN']);
const storeAdmin = checkRole(['ADMIN']);

// AUTH ROUTES
router.post('/auth/register', (req, res, next) => RegisterController.register(req, res, next));
router.post('/auth/login', (req, res, next) => AuthController.login(req, res, next));
router.get('/auth/me', verifyToken, (req, res, next) => AuthController.getProfile(req, res, next));
router.post('/auth/verify-admin-action', verifyToken, adminOnly, (req, res, next) => AuthController.verifyAdminAction(req, res, next));
router.post('/auth/forgot-password', (req, res, next) => PasswordResetController.forgotPassword(req, res, next));
router.post('/auth/reset-password', (req, res, next) => PasswordResetController.resetPassword(req, res, next));

// BCV RATE
router.get('/bcv/tasa', (req, res, next) => BcvRateController.getRate(req, res, next));

// CAJA REGISTRADORA
router.get('/caja/estado', verifyToken, checkSubscriptionActive, checkFeature('caja'), (req, res, next) => CashRegisterController.getStatus(req, res, next));
router.post('/caja/abrir', verifyToken, checkSubscriptionActive, checkFeature('caja'), (req, res, next) => CashRegisterController.openCaja(req, res, next));
router.post('/caja/cerrar', verifyToken, checkSubscriptionActive, checkFeature('caja'), (req, res, next) => CashRegisterController.closeCaja(req, res, next));

// VENTAS
router.post('/ventas/crear', verifyToken, checkSubscriptionActive, checkFeature('pos'), (req, res, next) => SaleController.processSale(req, res, next));

// CUENTAS POR PAGAR
router.get('/cuentas/pendientes', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('cuentas'), (req, res, next) => AccountPayableController.getAccounts(req, res, next));
router.put('/cuentas/:id/pagar', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('cuentas'), (req, res, next) => AccountPayableController.payAccount(req, res, next));

// CLIENTES (Plan Estándar+)
router.get('/clientes', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('clientes'), (req, res, next) => ClienteController.list(req, res, next));
router.post('/clientes', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('clientes'), (req, res, next) => ClienteController.create(req, res, next));
router.delete('/clientes/:id', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('clientes'), (req, res, next) => ClienteController.remove(req, res, next));

// GASTOS ADMINISTRATIVOS (Plan Estándar+)
router.get('/gastos', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('gastos'), (req, res, next) => GastoController.list(req, res, next));
router.post('/gastos', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('gastos'), (req, res, next) => GastoController.create(req, res, next));
router.delete('/gastos/:id', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('gastos'), (req, res, next) => GastoController.remove(req, res, next));

// RESUMEN Y ESTADÍSTICAS
router.get('/resumen/financiero', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('resumen'), (req, res, next) => ReportController.getResumen(req, res, next));
router.get('/estadisticas/ventas', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('estadisticas'), (req, res, next) => ReportController.getEstadisticas(req, res, next));

// MULTI-SUCURSAL (Plan Pro)
router.get('/sucursales', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('multi_sucursal'), (req, res, next) => SucursalController.list(req, res, next));
router.post('/sucursales', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('multi_sucursal'), (req, res, next) => SucursalController.create(req, res, next));
router.patch('/sucursales/:id', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('multi_sucursal'), (req, res, next) => SucursalController.update(req, res, next));
router.delete('/sucursales/:id', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('multi_sucursal'), (req, res, next) => SucursalController.remove(req, res, next));

// EQUIPO DE LA TIENDA (límite por plan)
router.get('/tienda/equipo', verifyToken, storeAdmin, (req, res, next) => TeamController.listTeam(req, res, next));
router.post('/tienda/equipo', verifyToken, checkSubscriptionActive, storeAdmin, (req, res, next) => TeamController.createTeamMember(req, res, next));

// SUSCRIPCIONES
router.get('/suscripciones/mi-plan', verifyToken, (req, res, next) => SubscriptionController.getMyPlan(req, res, next));
router.get('/suscripciones/mis-reportes', verifyToken, storeAdmin, (req, res, next) => SubscriptionController.getMyPaymentReports(req, res, next));
router.post('/suscripciones/reportar-pago', verifyToken, storeAdmin, reportPaymentLimiter, (req, res, next) => SubscriptionController.reportPayment(req, res, next));

// INVENTARIO / PRODUCTOS
router.get('/productos/categorias', verifyToken, checkSubscriptionActive, checkFeature('inventario'), (req, res, next) => AdminController.getCategories(req, res, next));
router.get('/productos/:id', verifyToken, checkSubscriptionActive, checkFeature('inventario'), (req, res, next) => AdminController.getProductById(req, res, next));
router.get('/productos', verifyToken, checkSubscriptionActive, checkFeature('inventario'), (req, res, next) => AdminController.getProducts(req, res, next));
router.post('/productos', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('inventario'), (req, res, next) => AdminController.createProduct(req, res, next));
router.patch('/productos/:id', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('inventario'), (req, res, next) => AdminController.updateProduct(req, res, next));
router.delete('/productos/:id', verifyToken, checkSubscriptionActive, adminOnly, requireAdminReauth, checkFeature('inventario'), (req, res, next) => AdminController.deleteProduct(req, res, next));

// DASHBOARD STATS
router.get('/dashboard/stats', verifyToken, checkSubscriptionActive, adminOnly, checkFeature('dashboard'), (req, res, next) => AdminController.getDashboardStats(req, res, next));

// SUPER-ADMIN: gestión de tiendas suscritas
router.get('/admin/stores', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.getStores(req, res, next));
router.post('/admin/stores/plan', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.updateStorePlan(req, res, next));
router.post('/admin/stores/status', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.toggleStoreStatus(req, res, next));

// SUPER-ADMIN: pagos de suscripción reportados por clientes
router.get('/admin/pagos/pendientes', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.getPendingPayments(req, res, next));
router.post('/admin/pagos/:pagoId/aprobar', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.approvePayment(req, res, next));
router.post('/admin/pagos/:pagoId/rechazar', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.rejectPayment(req, res, next));

// USUARIOS (SUPERADMIN)
router.get('/admin/users', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => UserController.listUsers(req, res, next));
router.post('/admin/users', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => UserController.createUser(req, res, next));
router.patch('/admin/users/:id', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => UserController.updateUser(req, res, next));
router.post('/admin/users/:id/status', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => UserController.updateUserStatus(req, res, next));
router.delete('/admin/users/:id', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => UserController.deleteUser(req, res, next));
router.post('/admin/users/:id/restore', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => UserController.restoreUser(req, res, next));

module.exports = router;
