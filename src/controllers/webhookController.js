const db = require('../config/db');
const { fulfillOrderJIT } = require('../services/supplierService'); // 👈 Importar el servicio JIT

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

            // 1. Actualizar la orden a COMPLETED en la base de datos
            await db.query(
                'UPDATE orders SET status = $1 WHERE id = $2',
                ['COMPLETED', order.id]
            );

            console.log(`¡Orden #${order.id} completada automáticamente por pago móvil!`);

            // 2. DISPARAR EL SERVICIO JIT AUTOMÁTICAMENTE 🚀
            // 2. DISPARAR EL SERVICIO JIT AUTOMÁTICAMENTE 🚀
            if (order.product_id) {
                const jitResult = await fulfillOrderJIT(order.product_id, order.customer_phone);
                if (jitResult.success) {
                    console.log(`[JIT] Producto entregado al cliente con éxito. Código: ${jitResult.code}`);

                    // 👈 Guardar el código digital generado en la base de datos
                    await db.query(
                        'UPDATE orders SET digital_code = $1 WHERE id = $2',
                        [jitResult.code, order.id]
                    );
                    console.log(`[Database] Código digital ${jitResult.code} guardado en la Orden #${order.id}`);

                } else {
                    console.error(`[JIT] Alerta: El pago fue aprobado pero falló el despacho automático.`);
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