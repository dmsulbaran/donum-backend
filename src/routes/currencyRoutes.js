const express = require('express');
const router = express.Router();
const { getExchangeRate } = require('../services/currencyService');

// Endpoint para obtener la tasa del BCV en tiempo real
router.get('/currency/rate', async (req, res) => {
    try {
        const rate = await getExchangeRate();
        return res.status(200).json({
            success: true,
            status: 'success',
            source: 'Banco Central de Venezuela (BCV)',
            rate: rate,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error al obtener la tasa oficial:', error.message);
        return res.status(200).json({
            success: true,
            status: 'fallback',
            source: 'Tasa de Respaldo Oficial',
            rate: 48.50,
            timestamp: new Date().toISOString()
        });
    }
});

// Alias simplificado
router.get('/bcv', async (req, res) => {
    try {
        const rate = await getExchangeRate();
        return res.status(200).json({ rate, success: true });
    } catch (err) {
        return res.status(200).json({ rate: 48.50, success: true });
    }
});

module.exports = router;
