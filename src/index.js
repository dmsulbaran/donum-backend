const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const authRoutes = require('./routes/authRoutes');
const bitrefillTestRoutes = require('./routes/bitrefillTestRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS y parseo JSON
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'api-key']
}));
app.use(express.json());

// Registrar Rutas de la API
app.use('/api', webhookRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', currencyRoutes);
app.use('/api', authRoutes);
app.use('/api', bitrefillTestRoutes);

// Ruta de salud del sistema
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({
            status: 'success',
            message: 'Donum Backend funcionando al 100%',
            database_time: result.rows[0].now,
            server_port: PORT
        });
    } catch (err) {
        console.error('Error en health check:', err);
        res.status(500).json({ status: 'error', message: 'Error al conectar con la base de datos' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de Donum corriendo en el puerto ${PORT}`);
});