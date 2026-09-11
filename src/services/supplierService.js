const fulfillOrderJIT = async (productId, customerPhone) => {
    try {
        console.log(`[JIT Service] Solicitando despacho al proveedor para el producto ID: ${productId}...`);

        // Simulamos un retraso de red típico de una API externa (ej. 1 segundo)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Aquí simularíamos la respuesta exitosa del mayorista generando un código digital de prueba
        const digitalCode = "DONUM-PIN-" + Math.floor(100000 + Math.random() * 900000);

        console.log(`[JIT Service] ¡Despacho exitoso! Código generado: ${digitalCode} para el número ${customerPhone}`);

        return {
            success: true,
            code: digitalCode,
            message: "Producto despachado correctamente por JIT"
        };
    } catch (error) {
        console.error("[JIT Service Error] Falló la comunicación con el proveedor mayorista:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

module.exports = { fulfillOrderJIT };