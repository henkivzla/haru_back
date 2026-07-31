const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');
const AuthController = require('../controllers/AuthController');
const CashRegisterController = require('../controllers/CashRegisterController');
const SaleController = require('../controllers/SaleController');
const BcvRateController = require('../controllers/BcvRateController');
const AccountPayableController = require('../controllers/AccountPayableController');

// AUTH ROUTES
router.post('/auth/login', (req, res, next) => AuthController.login(req, res, next));
router.get('/auth/me', authMiddleware, (req, res, next) => AuthController.getProfile(req, res, next));

// BCV RATE
router.get('/bcv/tasa', (req, res, next) => BcvRateController.getRate(req, res, next));

// CAJA REGISTRADORA
router.get('/caja/estado', authMiddleware, (req, res, next) => CashRegisterController.getStatus(req, res, next));
router.post('/caja/abrir', authMiddleware, (req, res, next) => CashRegisterController.openCaja(req, res, next));
router.post('/caja/cerrar', authMiddleware, (req, res, next) => CashRegisterController.closeCaja(req, res, next));

// VENTAS & CASHEA
router.post('/ventas/crear', authMiddleware, (req, res, next) => SaleController.processSale(req, res, next));
router.get('/ventas/cashea-simulacion', (req, res, next) => SaleController.simulateCashea(req, res, next));

// CUENTAS POR PAGAR
router.get('/cuentas/pendientes', authMiddleware, (req, res, next) => AccountPayableController.getAccounts(req, res, next));
router.put('/cuentas/:id/pagar', authMiddleware, (req, res, next) => AccountPayableController.payAccount(req, res, next));

module.exports = router;
