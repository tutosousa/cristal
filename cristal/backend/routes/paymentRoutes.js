const express = require('express');
const router = express.Router();
const { getConfig, processarPagamento, receberWebhook } = require('../controllers/paymentController');

router.get('/config', getConfig);

router.post('/processar', processarPagamento);

router.post('/webhook', receberWebhook);
router.get('/webhook', receberWebhook);

module.exports = router;
