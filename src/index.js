const express = require('express');
require('dotenv').config();
const db = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Registrar Rutas
app.use('/api', webhookRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);

// Ruta de salud del sistema
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({
            status: 'success',
            message: 'Donum Backend funcionando al 100%',
            database_time: result.rows[0].now
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Error al conectar con la base de datos' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de Donum corriendo en el puerto ${PORT}`);
});