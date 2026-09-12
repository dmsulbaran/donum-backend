const axios = require('axios');

const getExchangeRate = async () => {
    try {
        // Usamos una ruta alternativa directa de monitores en Venezuela
        const response = await axios.get('https://pydolarvenezuela-api.vercel.app/api/v1/dollar');

        // Extraemos la tasa del BCV de la respuesta general
        const bcvRate = response.data.monitors.bcv.price;

        console.log(`Tasa del día obtenida con éxito: ${bcvRate} VES/USD`);
        return parseFloat(bcvRate);
    } catch (error) {
        console.error("Error al obtener la tasa de cambio automática, usando tasa de respaldo:", error.message);
        return 36.50; // Tasa de respaldo de seguridad
    }
};

module.exports = { getExchangeRate };