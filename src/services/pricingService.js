const { getExchangeRate } = require('./currencyService');
const pool = require('../config/db');

const calculateProductPriceInVES = async (productId) => {
    try {
        // 1. Buscar el producto en la base de datos
        const productQuery = await pool.query(
            'SELECT name, price_usd, profit_margin FROM products WHERE id = $1',
            [productId]
        );

        if (productQuery.rows.length === 0) {
            throw new Error('Producto no encontrado');
        }

        const product = productQuery.rows[0];

        // 2. Obtener la tasa de cambio actual del día
        const currentRate = await getExchangeRate();

        // 3. Calcular el precio final en Bolívares (USD * Tasa * Margen de ganancia/protección)
        const finalPriceVES = (parseFloat(product.price_usd) * currentRate) * parseFloat(product.profit_margin);

        return {
            productName: product.name,
            priceUSD: product.price_usd,
            exchangeRateUsed: currentRate,
            totalVES: finalPriceVES.toFixed(2) // Redondeado a 2 decimales para el banco
        };

    } catch (error) {
        console.error("Error calculando el precio:", error.message);
        throw error;
    }
};

module.exports = {
    calculateProductPriceInVES
};