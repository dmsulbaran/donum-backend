const axios = require('axios');

const getExchangeRate = async () => {
    try {
        // Apuntamos al endpoint operativo real de tasas de DolarVZLA
        const response = await axios.get('https://api.dolarvzla.com/v1/dollar/bcv', {
            headers: {
                'Authorization': 'Bearer 52c2d45fc80f57fda83354a1fae6e92b6d56242dcf3ccd6a22e472775091d811',
                'Accept': 'application/json'
            }
        });

        const bcvRate = response.data.price || response.data.monitors?.bcv?.price;

        if (!bcvRate) throw new Error("No se encontró la tasa en el JSON operativo");

        console.log(`Tasa del día obtenida con éxito: ${bcvRate} VES/USD`);
        return parseFloat(bcvRate);
    } catch (error) {
        console.warn("Aviso: Usando tasa de respaldo del día (842.21):", error.message);
        return 842.21; // Tasa de respaldo fija y segura
    }
};

module.exports = { getExchangeRate };