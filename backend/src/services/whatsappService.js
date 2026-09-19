const idInstance = process.env.GREEN_API_ID_INSTANCE;
const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;

const sendWhatsAppMessage = async (to, message) => {
  if (!to) return;

  if (!idInstance || !apiTokenInstance) {
    console.log(`[Green-API Mock] Mensaje a ${to}: ${message}`);
    console.log("-> Configura GREEN_API_ID_INSTANCE y GREEN_API_TOKEN_INSTANCE en el .env para enviar mensajes reales.");
    return;
  }

  try {
    // Formatear el número: Quitar todo lo que no sea número
    let formattedNumber = to.toString().replace(/[^0-9]/g, '');
    
    // Asumir Colombia (+57) si tiene 10 dígitos (ej: 3157986475 -> 573157986475)
    if (formattedNumber.length === 10) {
      formattedNumber = `57${formattedNumber}`;
    } else if (formattedNumber.startsWith('0')) {
      // Remover 0 inicial si existe por si acaso
      formattedNumber = formattedNumber.substring(1);
    }
    
    // Green-API exige el sufijo @c.us para cuentas de WhatsApp estándar
    const chatId = `${formattedNumber}@c.us`;

    const baseUrl = process.env.GREEN_API_URL || 'https://api.green-api.com';
    const url = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    
    const payload = {
      chatId: chatId,
      message: message
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log(`Mensaje enviado exitosamente a ${chatId}. ID: ${data.idMessage}`);
    return data;
  } catch (error) {
    console.error("Error al enviar mensaje por Green-API:", error.message);
    // No lanzamos error para evitar romper el flujo del backend
  }
};

module.exports = {
  sendWhatsAppMessage
};
