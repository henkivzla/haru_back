const express = require('express');
const router = express.Router();

const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const AuthController = require('../controllers/AuthController');
const CashRegisterController = require('../controllers/CashRegisterController');
const SaleController = require('../controllers/SaleController');
const BcvRateController = require('../controllers/BcvRateController');
const AccountPayableController = require('../controllers/AccountPayableController');
const AdminController = require('../controllers/AdminController');

// AUTH ROUTES
router.post('/auth/login', (req, res, next) => AuthController.login(req, res, next));
router.get('/auth/me', verifyToken, (req, res, next) => AuthController.getProfile(req, res, next));

// BCV RATE
router.get('/bcv/tasa', (req, res, next) => BcvRateController.getRate(req, res, next));

// CAJA REGISTRADORA
router.get('/caja/estado', verifyToken, (req, res, next) => CashRegisterController.getStatus(req, res, next));
router.post('/caja/abrir', verifyToken, (req, res, next) => CashRegisterController.openCaja(req, res, next));
router.post('/caja/cerrar', verifyToken, (req, res, next) => CashRegisterController.closeCaja(req, res, next));

// VENTAS
router.post('/ventas/crear', verifyToken, (req, res, next) => SaleController.processSale(req, res, next));

// CUENTAS POR PAGAR (ADMIN & GERENTE)
router.get('/cuentas/pendientes', verifyToken, checkRole(['ADMIN', 'SUPERADMIN']), (req, res, next) => AccountPayableController.getAccounts(req, res, next));
router.put('/cuentas/:id/pagar', verifyToken, checkRole(['ADMIN', 'SUPERADMIN']), (req, res, next) => AccountPayableController.payAccount(req, res, next));

// SUPER-ADMIN MANAGEMENT (SOLO ACCESIBLE POR DUEÑO / SUPERADMIN)
router.get('/admin/stores', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.getStores(req, res, next));
router.post('/admin/stores/plan', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.updateStorePlan(req, res, next));
router.post('/admin/stores/status', verifyToken, checkRole(['SUPERADMIN']), (req, res, next) => AdminController.toggleStoreStatus(req, res, next));

module.exports = router;
