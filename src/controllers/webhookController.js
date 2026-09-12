const db = require('../config/db');
const { fulfillOrderBitrefillJIT } = require('../services/bitrefillService'); // 👈 Importamos el servicio de Bitrefill
const { sendWhatsAppNotification } = require('../services/notificationService');

const handleBdvWebhook = async (req, res) => {
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
        // 🛡️ Protección extra por si req.body llega vacío
        if (!req.body) {
            return res.status(400).json({
                codigo: "99",
                mensajeCliente: "Datos inválidos",
                mensajeSistema: "El cuerpo de la petición (req.body) está vacío"
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

        let orderResult = await db.query(
            'SELECT * FROM orders WHERE bank_reference = $1',
            [referenciaBancoOrdenante]
        );

        if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];

            if (order.status === 'COMPLETED') {
                return res.status(200).json({
                    codigo: "01",
                    mensajeCliente: "pago previamente recibido",
                    mensajeSistema: "renotificado"
                });
            }

            // 1. Actualizar la orden a COMPLETED en la base de datos (Confirmamos que los bolívares entraron)
            await db.query(
                'UPDATE orders SET status = $1 WHERE id = $2',
                ['COMPLETED', order.id]
            );

            console.log(`¡Orden #${order.id} completada automáticamente por pago móvil local!`);

            // 2. DISPARAR LA COMPRA AUTOMÁTICA EN BITREFILL POR DETRÁS (Usando nuestros fondos en USDT) 🚀
            if (order.product_id) {
                const jitResult = await fulfillOrderBitrefillJIT(order.product_id, order.customer_phone);

                if (jitResult.success) {
                    console.log(`[Bitrefill JIT] Producto adquirido con éxito. Código: ${jitResult.code}`);

                    // Guardar el código digital obtenido de Bitrefill en la orden
                    await db.query(
                        'UPDATE orders SET digital_code = $1 WHERE id = $2',
                        [jitResult.code, order.id]
                    );
                    console.log(`[Database] Código digital guardado en la Orden #${order.id}`);

                    // 📉 3. DESCONTAR STOCK LOCAL DEL PRODUCTO 📦
                    await db.query(
                        'UPDATE products SET stock = stock - 1 WHERE id = $1',
                        [order.product_id]
                    );
                    console.log(`[Database] Stock actualizado: se restó 1 unidad al producto ID #${order.product_id}`);

                    // 📱 4. DISPARAR LA NOTIFICACIÓN WHATSAPP AL CLIENTE 🚀
                    const productRes = await db.query('SELECT name FROM products WHERE id = $1', [order.product_id]);
                    const productTitle = productRes.rows.length > 0 ? productRes.rows[0].name : 'Producto Digital Donum';

                    await sendWhatsAppNotification(order.customer_phone, productTitle, jitResult.code);

                } else {
                    console.error(`[Bitrefill JIT] Alerta crítica: El pago en bolívares entró, pero falló la compra automática en Bitrefill: ${jitResult.error}`);
                    // Aquí puedes registrar la orden en una tabla de incidencias o marcarla para revisión manual
                }
            }

        } else {
            // Si pagó directo sin registrar orden previa
            await db.query(
                'INSERT INTO orders (bank_reference, amount, status) VALUES ($1, $2, $3)',
                [referenciaBancoOrdenante, monto, 'COMPLETED']
            );
            console.log(`¡Pago registrado y orden creada para la referencia: ${referenciaBancoOrdenante}!`);
        }

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
};

module.exports = { handleBdvWebhook };