const db = require('../config/db');

const getProducts = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id ASC');
        return res.status(200).json({
            status: 'success',
            total: result.rows.length,
            products: result.rows
        });
    } catch (error) {
        console.error("Error al obtener los productos:", error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al consultar el catálogo'
        });
    }
};

module.exports = { getProducts };