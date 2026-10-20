const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/auth');
const { requireCustomerAuth } = require('../middleware/customerAuth');
const {
  createOrder,
  getShippingQuote,
  getCidadesEntrega,
  listNewOrders,
  getOrderByNumber,
  listOrders,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');

router.post('/frete', getShippingQuote);

// Lista pública das cidades de entrega local de flores e seus valores —
// o checkout consulta essa rota pra montar o seletor de cidade, usando os
// mesmos dados que o backend usa pra validar e recalcular o frete.
router.get('/cidades-entrega', getCidadesEntrega);

// Checkout exige login do cliente — requireCustomerAuth barra a requisição
// com 401 se não vier um token de cliente válido.
router.post('/', requireCustomerAuth, createOrder);
router.get('/numero/:numero', getOrderByNumber);

// Admin
router.get('/admin/novos', requireAdminAuth, listNewOrders);
router.get('/admin/all', requireAdminAuth, listOrders);
router.get('/admin/:id', requireAdminAuth, getOrderById);
router.patch('/admin/:id/status', requireAdminAuth, updateOrderStatus);

module.exports = router;
