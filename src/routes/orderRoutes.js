const express = require('express');
const router = express.Router();
const { createOrder, getOrderById, getPublicOrderStatus } = require('../controllers/orderController');

router.post('/orders', createOrder);
router.post('/orders/verify', getPublicOrderStatus); // 👈 Nueva ruta pública de consulta
router.get('/orders/:id', getOrderById);

module.exports = router;