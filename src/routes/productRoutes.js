const express = require('express');
const router = express.Router();
const { getProducts } = require('../controllers/productController');
const { calculateProductPriceInVES } = require('../services/pricingService');

router.get('/products', getProducts);

router.get('/calculate-price/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const pricingInfo = await calculateProductPriceInVES(productId);

        res.json({
            success: true,
            message: 'Precio calculado con tasa actual de la API',
            data: pricingInfo
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;