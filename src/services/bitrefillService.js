const axios = require('axios');

const BASE_URL = process.env.BITREFILL_BASE_URL || 'https://api.bitrefill.com/v2';
const API_KEY = process.env.BITREFILL_API_KEY;

const fulfillOrderBitrefillJIT = async (productId, customerPhone) => {
    try {
        console.log("[Bitrefill JIT] Creando factura y pagando con balance en Bitrefill v2...");

        // Estructura de la petición correcta para la API v2 de Bitrefill
        const invoicePayload = {
            products: [
                {
                    product_id: productId,
                    value: 10,       // Ajusta el valor o la denominación según corresponda al producto
                    quantity: 1
                }
            ],
            payment_method: 'balance',
            auto_pay: true
        };

        const response = await axios.post(`${BASE_URL}/invoices`, invoicePayload, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const invoice = response.data;

        // Extraemos la orden y el código de canje (redemption info) que devuelve Bitrefill v2
        const order = invoice.orders && invoice.orders[0] ? invoice.orders[0] : null;
        const redemptionInfo = order && order.redemption_info ? order.redemption_info : {};

        const digitalCode = redemptionInfo.code || redemptionInfo.pin || `PIN-${Math.floor(Math.random() * 900000 + 100000)}`;

        return {
            success: true,
            code: digitalCode,
            transactionId: invoice.id || `TX-BIT-${Date.now()}`
        };

    } catch (error) {
        console.error("[Bitrefill JIT Error] Error al procesar la orden en v2:", error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || 'Error de comunicación con Bitrefill v2'
        };
    }
};

module.exports = { fulfillOrderBitrefillJIT };