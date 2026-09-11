const express = require('express');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(require('./webhook'));

// Ruta de prueba para verificar que el servidor y la BD responden
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