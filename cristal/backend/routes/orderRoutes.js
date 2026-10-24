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

router.get('/cidades-entrega', getCidadesEntrega);

router.post('/', requireCustomerAuth, createOrder);
router.get('/numero/:numero', getOrderByNumber);

router.get('/admin/novos', requireAdminAuth, listNewOrders);
router.get('/admin/all', requireAdminAuth, listOrders);
router.get('/admin/:id', requireAdminAuth, getOrderById);
router.patch('/admin/:id/status', requireAdminAuth, updateOrderStatus);

module.exports = router;
