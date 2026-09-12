const db = require('../config/db');

const createOrder = async (req, res) => {
    try {
        const { product_id, customer_phone, bank_reference, amount } = req.body;

        // Validar que el producto exista
        const productCheck = await db.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'El producto seleccionado no existe' });
        }

        const product = productCheck.rows[0];
        // 👈 Validación de stock
        if (product.stock <= 0) {
            return res.status(400).json({ status: 'error', message: 'Lo sentimos, este producto está agotado.' });
        }

        // Insertar la orden como pendiente vinculada al pago por referencia
        const newOrder = await db.query(
            `INSERT INTO orders (bank_reference, amount, status, product_id, customer_phone) 
             VALUES ($1, $2, 'PENDING', $3, $4) RETURNING *`,
            [bank_reference, product.price_ves, product_id, customer_phone]
        );

        return res.status(201).json({
            status: 'success',
            message: 'Orden creada con éxito. Realice el Pago Móvil para procesar.',
            order: newOrder.rows[0]
        });

    } catch (error) {
        console.error("Error al crear la orden:", error);
        return res.status(500).json({ status: 'error', message: 'Error interno al crear la orden' });
    }
};

// 👈 AQUÍ VA EL NUEVO CONTROLADOR PARA CONSULTAR LA ORDEN Y SU PIN DIGITAL:
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM orders WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Orden no encontrada' });
        }

        return res.status(200).json({
            status: 'success',
            order: result.rows[0]
        });
    } catch (error) {
        console.error("Error al consultar la orden:", error);
        return res.status(500).json({ status: 'error', message: 'Error interno al consultar la orden' });
    }
};

// Endpoint de consulta pública para el cliente
const getPublicOrderStatus = async (req, res) => {
    try {
        const { customer_phone, bank_reference } = req.body;

        // Validar que mandó los datos necesarios
        if (!customer_phone || !bank_reference) {
            return res.status(400).json({
                status: 'error',
                message: 'Debe proporcionar el número de teléfono y la referencia de pago.'
            });
        }

        // Buscar la orden que coincida con ambos datos
        const result = await db.query(
            'SELECT id, product_id, amount, status, digital_code, created_at FROM orders WHERE customer_phone = $1 AND bank_reference = $2',
            [customer_phone, bank_reference]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No se encontró ninguna orden con esos datos. Verifique su teléfono y referencia.'
            });
        }

        const order = result.rows[0];

        // Si la orden está pendiente, informarle al usuario
        if (order.status === 'PENDING') {
            return res.status(200).json({
                status: 'pending',
                message: 'Su pago está siendo verificado. Vuelva a intentar en unos minutos.',
                order: {
                    id: order.id,
                    status: order.status,
                    amount: order.amount,
                    created_at: order.created_at
                }
            });
        }

        // Si ya está completada, le entregamos su código digital con orgullo 🚀
        return res.status(200).json({
            status: 'success',
            message: '¡Pago verificado y producto despachado con éxito!',
            order: {
                id: order.id,
                status: order.status,
                amount: order.amount,
                digital_code: order.digital_code, // 👈 ¡Aquí va el PIN entregado por el JIT!
                created_at: order.created_at
            }
        });

    } catch (error) {
        console.error("Error en consulta pública de orden:", error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor al consultar la orden' });
    }
};

// 👈 Exportamos ambas funciones para que las rutas puedan usarlas
module.exports = { createOrder, getOrderById, getPublicOrderStatus };