const express = require('express');
const router = express.Router();

const { verifyToken, checkRole, checkFeature } = require('../middlewares/authMiddleware');
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

// AUTH ROUTES
router.post('/auth/register', (req, res, next) => RegisterController.register(req, res, next));
router.post('/auth/login', (req, res, next) => AuthController.login(req, res, next));
router.get('/auth/me', verifyToken, (req, res, next) => AuthController.getProfile(req, res, next));
router.post('/auth/forgot-password', (req, res, next) => PasswordResetController.forgotPassword(req, res, next));
router.post('/auth/reset-password', (req, res, next) => PasswordResetController.resetPassword(req, res, next));

// BCV RATE
router.get('/bcv/tasa', (req, res, next) => BcvRateController.getRate(req, res, next));

// CAJA REGISTRADORA
router.get('/caja/estado', verifyToken, (req, res, next) => CashRegisterController.getStatus(req, res, next));
router.post('/caja/abrir', verifyToken, (req, res, next) => CashRegisterController.openCaja(req, res, next));
router.post('/caja/cerrar', verifyToken, (req, res, next) => CashRegisterController.closeCaja(req, res, next));

// VENTAS
router.post('/ventas/crear', verifyToken, (req, res, next) => SaleController.processSale(req, res, next));

// CUENTAS POR PAGAR
router.get('/cuentas/pendientes', verifyToken, checkRole(['ADMIN', 'SUPERADMIN']), checkFeature('cuentas'), (req, res, next) => AccountPayableController.getAccounts(req, res, next));
router.put('/cuentas/:id/pagar', verifyToken, checkRole(['ADMIN', 'SUPERADMIN']), checkFeature('cuentas'), (req, res, next) => AccountPayableController.payAccount(req, res, next));

// SUSCRIPCIONES
router.get('/suscripciones/mi-plan', verifyToken, (req, res, next) => SubscriptionController.getMyPlan(req, res, next));
router.post('/suscripciones/reportar-pago', verifyToken, checkRole(['ADMIN', 'SUPERADMIN']), (req, res, next) => SubscriptionController.reportPayment(req, res, next));

// INVENTARIO / PRODUCTOS
router.get('/productos', verifyToken, (req, res, next) => AdminController.getProducts(req, res, next));
router.post('/productos', verifyToken, checkRole(['ADMIN', 'SUPERADMIN']), (req, res, next) => AdminController.createProduct(req, res, next));

// DASHBOARD STATS
router.get('/dashboard/stats', verifyToken, (req, res, next) => AdminController.getDashboardStats(req, res, next));

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
