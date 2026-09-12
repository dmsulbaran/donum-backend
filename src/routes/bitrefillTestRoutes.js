const express = require('express');
const router = express.Router();
const axios = require('axios');

const BASE_URL = process.env.BITREFILL_BASE_URL || 'https://api.bitrefill.com/v2';
const API_KEY = process.env.BITREFILL_API_KEY;

router.get('/bitrefill/products', async (req, res) => {
    try {
        const response = await axios.get(`${BASE_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        return res.json(response.data);
    } catch (error) {
        return res.status(500).json({
            error: error.response?.data || error.message
        });
    }
});

module.exports = router;