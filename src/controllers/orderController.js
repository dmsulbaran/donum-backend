const db = require('../config/db');
const { getExchangeRate } = require('../services/currencyService');

const createOrder = async (req, res) => {
    try {
        const { product_id, customer_phone, bank_reference, amount, items, payment_method } = req.body;

        // Si se envió un array de items desde el carrito
        if (items && Array.isArray(items) && items.length > 0) {
            const createdOrders = [];
            const currentRate = await getExchangeRate();

            for (const item of items) {
                // Buscar producto por ID numérico, bitrefill_id o nombre
                let productQuery;
                if (typeof item.id === 'number' || !isNaN(Number(item.id))) {
                    productQuery = await db.query('SELECT * FROM products WHERE id = $1', [Number(item.id)]);
                } else if (item.dbProductId) {
                    productQuery = await db.query('SELECT * FROM products WHERE id = $1', [Number(item.dbProductId)]);
                } else {
                    productQuery = await db.query(
                        'SELECT * FROM products WHERE bitrefill_id = $1 OR name ILIKE $2 LIMIT 1',
                        [item.id, `%${item.brand || item.name}%`]
                    );
                }

                const product = productQuery.rows[0] || (await db.query('SELECT * FROM products LIMIT 1')).rows[0];
                const itemAmountVES = item.priceUSD
                    ? (parseFloat(item.priceUSD) * currentRate).toFixed(2)
                    : (parseFloat(product.price_usd) * currentRate).toFixed(2);

                const ref = bank_reference || `PM-${Math.floor(100000 + Math.random() * 900000)}`;

                const orderRes = await db.query(
                    `INSERT INTO orders (bank_reference, amount, status, product_id, customer_phone) 
                     VALUES ($1, $2, 'PENDING', $3, $4) RETURNING *`,
                    [ref, itemAmountVES, product.id, customer_phone || '04120000000']
                );
                createdOrders.push(orderRes.rows[0]);
            }

            return res.status(201).json({
                status: 'success',
                message: 'Órdenes creadas con éxito en la base de datos.',
                orders: createdOrders,
                totalOrders: createdOrders.length
            });
        }

        // Orden individual
        if (!product_id) {
            return res.status(400).json({ status: 'error', message: 'Debe especificar el product_id' });
        }

        // Buscar producto por ID o identificador
        let productCheck;
        if (typeof product_id === 'number' || !isNaN(Number(product_id))) {
            productCheck = await db.query('SELECT * FROM products WHERE id = $1', [Number(product_id)]);
        } else {
            productCheck = await db.query(
                'SELECT * FROM products WHERE bitrefill_id = $1 OR name ILIKE $2 LIMIT 1',
                [product_id, `%${product_id}%`]
            );
        }

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'El producto seleccionado no existe' });
        }

        const product = productCheck.rows[0];

        // Validar stock disponible
        if (product.stock !== null && product.stock <= 0) {
            return res.status(400).json({ status: 'error', message: 'Lo sentimos, este producto está agotado temporalmente.' });
        }

        // Calcular el monto en VES si no vino en el body
        let finalAmountVES = amount;
        if (!finalAmountVES) {
            if (product.price_ves) {
                finalAmountVES = product.price_ves;
            } else {
                const currentRate = await getExchangeRate();
                finalAmountVES = (parseFloat(product.price_usd) * currentRate * (parseFloat(product.profit_margin) || 1)).toFixed(2);
            }
        }

        const finalRef = bank_reference || `PM-${Math.floor(100000 + Math.random() * 900000)}`;

        // Insertar en PostgreSQL
        const newOrder = await db.query(
            `INSERT INTO orders (bank_reference, amount, status, product_id, customer_phone) 
             VALUES ($1, $2, 'PENDING', $3, $4) RETURNING *`,
            [finalRef, finalAmountVES, product.id, customer_phone || '04120000000']
        );

        return res.status(201).json({
            status: 'success',
            message: 'Orden creada con éxito en Donum. Realice su Pago Móvil para procesar.',
            order: newOrder.rows[0]
        });

    } catch (error) {
        console.error("Error al crear la orden:", error);
        return res.status(500).json({ status: 'error', message: 'Error interno al crear la orden en PostgreSQL' });
    }
};

// Consultar orden por ID
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT o.*, p.name as product_name, p.price_usd, p.category 
             FROM orders o 
             LEFT JOIN products p ON o.product_id = p.id 
             WHERE o.id = $1`,
            [id]
        );

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

// Endpoint de consulta pública para el cliente (validación de pago móvil y PIN)
const getPublicOrderStatus = async (req, res) => {
    try {
        const { customer_phone, bank_reference } = req.body;

        if (!customer_phone || !bank_reference) {
            return res.status(400).json({
                status: 'error',
                message: 'Debe proporcionar el número de teléfono y la referencia de pago.'
            });
        }

        const result = await db.query(
            `SELECT o.id, o.product_id, o.amount, o.status, o.digital_code, o.created_at, p.name as product_name 
             FROM orders o 
             LEFT JOIN products p ON o.product_id = p.id 
             WHERE o.customer_phone = $1 AND o.bank_reference = $2`,
            [customer_phone, bank_reference]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No se encontró ninguna orden con esos datos. Verifique su teléfono y referencia.'
            });
        }

        const order = result.rows[0];

        if (order.status === 'PENDING') {
            return res.status(200).json({
                status: 'pending',
                message: 'Su pago está siendo verificado en el sistema interbancario.',
                order: {
                    id: order.id,
                    product_name: order.product_name,
                    status: order.status,
                    amount: order.amount,
                    created_at: order.created_at
                }
            });
        }

        return res.status(200).json({
            status: 'success',
            message: '¡Pago verificado y código digital despachado con éxito!',
            order: {
                id: order.id,
                product_name: order.product_name,
                status: order.status,
                amount: order.amount,
                digital_code: order.digital_code,
                created_at: order.created_at
            }
        });

    } catch (error) {
        console.error("Error en consulta pública de orden:", error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor al consultar la orden' });
    }
};

module.exports = { createOrder, getOrderById, getPublicOrderStatus };