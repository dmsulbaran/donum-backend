const sendWhatsAppNotification = async (customerPhone, productTitle, digitalCode) => {
    // Simulamos el tiempo de respuesta de una API de mensajería (como Twilio o Evolution API)
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("\n==================================================");
            console.log("📱 [WHATSAPP NOTIFICATION SERVICE - SIMULADO]");
            console.log(`📤 Enviando mensaje a: ${customerPhone}`);
            console.log(`💬 Mensaje: ¡Hola! Tu pago ha sido verificado con éxito.`);
            console.log(`🎁 Producto: ${productTitle}`);
            console.log(`🔑 Tu PIN / Código digital es: ${digitalCode}`);
            console.log("==================================================\n");

            resolve({ success: true, messageId: "Wamid_SIMULATED_" + Date.now() });
        }, 1000);
    });
};

module.exports = { sendWhatsAppNotification };