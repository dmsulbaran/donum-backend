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

module.exports = { createOrder };