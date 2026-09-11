const express = require('express');
const router = express.Router();
const db = require('./db');

router.post('/api/webhook/bdv', async (req, res) => {
    try {
        const apiKey = req.headers['api-key'];
        const TEST_API_KEY = '97F6F54EF1A84F3A24FE19A3B338C77A';

        if (!apiKey || apiKey !== TEST_API_KEY) {
            return res.status(200).json({
                codigo: "99",
                mensajeCliente: "Corrija el API KEY",
                mensajeSistema: "Error en API KEY"
            });
        }

        const {
            bancoOrdenante,
            referenciaBancoOrdenante,
            idCliente,
            numeroCliente,
            idComercio,
            numeroComercio,
            fecha,
            hora,
            monto
        } = req.body;

        console.log(`Pago móvil recibido de referencia: ${referenciaBancoOrdenante} por un monto de ${monto} VES`);

        // 1. Verificar si la referencia ya existe en la base de datos
        const existingOrder = await db.query(
            'SELECT * FROM orders WHERE bank_reference = $1',
            [referenciaBancoOrdenante]
        );

        if (existingOrder.rows.length > 0) {
            // Si ya existe, respondemos código 01 (Renotificado / Previamente recibido)
            return res.status(200).json({
                codigo: "01",
                mensajeCliente: "pago previamente recibido",
                mensajeSistema: "renotificado"
            });
        }

        // 2. Si no existe, guardamos la orden como 'COMPLETED' (o PENDING) en la base de datos
        await db.query(
            'INSERT INTO orders (bank_reference, amount, status) VALUES ($1, $2, $3)',
            [referenciaBancoOrdenante, monto, 'COMPLETED']
        );

        console.log(`¡Orden guardada y registrada con éxito para la referencia: ${referenciaBancoOrdenante}!`);

        // 3. Responder éxito al Banco de Venezuela (Código 00)
        return res.status(200).json({
            codigo: "00",
            mensajeCliente: "Aprobado",
            mensajeSistema: "Notificado"
        });

    } catch (error) {
        console.error("Error procesando el webhook del BDV:", error);
        return res.status(500).json({
            codigo: "99",
            mensajeCliente: "Error interno del servidor",
            mensajeSistema: error.message
        });
    }
});

module.exports = router;