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

// Variables en memoria para guardar el estado del chat (State Machine temporal)
// NOTA: Para producción con muchos usuarios, esto debería ir a Redis o a una tabla en Prisma.
const chatStates = new Map();

const handleIncomingMessage = async (webhookData, prisma) => {
  try {
    const messageData = webhookData.messageData;
    const senderData = webhookData.senderData;
    
    // Ignorar si no es mensaje de texto, o si lo enviamos nosotros mismos
    if (!messageData || !messageData.textMessageData || senderData.sender.includes(idInstance)) {
      return; 
    }

    const senderPhone = senderData.sender.replace('@c.us', '');
    const textReceived = messageData.textMessageData.textMessage.trim();

    console.log(`[WhatsApp Webhook] Mensaje de ${senderPhone}: ${textReceived}`);

    // Permitir al usuario cancelar cualquier flujo activo y volver al menú
    if (/^(salir|menu|menú|cancelar|0)$/i.test(textReceived)) {
      chatStates.delete(senderPhone);
      const user = await prisma.tendero.findFirst({ where: { telefono: senderPhone } });
      if (user) {
        const menuMsg = `¡Hola ${user.nombre_tienda}! 👋 Regresaste al menú principal. ¿En qué te puedo ayudar hoy? Responde con el número:\n*1️⃣* 🛒 Hacer un nuevo pedido\n*2️⃣* 🎁 Ofertas del día\n*3️⃣* 🚚 Estado de mi entrega\n*4️⃣* 🎧 Soporte / Reclamos`;
        return sendWhatsAppMessage(senderPhone, menuMsg);
      }
    }

    // === MÁQUINA DE ESTADOS BÁSICA ===
    let currentState = chatStates.get(senderPhone);

    // Expirar sesión automáticamente si pasaron más de 8 minutos (480,000 ms) sin responder
    if (currentState && (Date.now() - currentState.timestamp > 480000)) {
      chatStates.delete(senderPhone);
      currentState = undefined;
    }

    // 1. Estados activos (Cambio de número, Soporte, etc)
    if (currentState) {
      if (currentState.step === 'AWAITING_OLD_NUMBER') {
        const oldPhone = textReceived.replace(/[^0-9]/g, '');
        const user = await prisma.tendero.findFirst({ where: { telefono: oldPhone } });
        
        if (user) {
          await prisma.tendero.update({ where: { id: user.id }, data: { telefono: senderPhone } });
          chatStates.delete(senderPhone);
          await sendWhatsAppMessage(senderPhone, "🎉 ¡Listo! Tu número ha sido actualizado exitosamente.");
          const menuMsg = `¡Hola ${user.nombre_tienda}! 👋 ¿En qué te puedo ayudar hoy? Responde con el número de la opción:\n*1️⃣* 🛒 Hacer un nuevo pedido\n*2️⃣* 🎁 Ofertas del día\n*3️⃣* 🚚 Estado de mi entrega\n*4️⃣* 🎧 Soporte / Reclamos`;
          return sendWhatsAppMessage(senderPhone, menuMsg);
        } else {
          return sendWhatsAppMessage(senderPhone, "❌ No encontré ninguna cuenta con ese número. Por favor intenta de nuevo escribiendo tu número anterior:");
        }
      }

      if (currentState.step === 'AWAITING_ORDER_SELECTION') {
        const selectedIndex = parseInt(textReceived) - 1;
        const user = await prisma.tendero.findFirst({ where: { telefono: senderPhone } });
        
        if (textReceived === "4") {
           chatStates.delete(senderPhone);
           // O crear un ticket general sin pedido
           await prisma.ticketSoporte.create({
             data: { motivo: "Consulta general", tenderoId: user.id }
           });
           return sendWhatsAppMessage(senderPhone, "✅ Hemos creado un ticket general de soporte. Un asesor te contactará pronto.");
        } else if (isNaN(selectedIndex) || !currentState.orders[selectedIndex]) {
           return sendWhatsAppMessage(senderPhone, "❌ Opción no válida. Por favor, responde únicamente con el número de la lista (ejemplo: 1 o 2).");
        }

        const selectedOrder = currentState.orders[selectedIndex];
        const orderCode = selectedOrder.codigo || selectedOrder.id;
        chatStates.set(senderPhone, { step: 'AWAITING_TICKET_REASON', orderId: selectedOrder.id, orderCode: orderCode, timestamp: Date.now() });
        
        return sendWhatsAppMessage(senderPhone, `Sobre tu pedido #${orderCode}, ¿qué inconveniente tuviste?\n*1️⃣* Producto dañado o vencido\n*2️⃣* Faltaron productos\n*3️⃣* Problema con la factura\n*4️⃣* Otro problema`);
      }

      if (currentState.step === 'AWAITING_TICKET_REASON') {
        if (!["1", "2", "3", "4"].includes(textReceived)) {
          return sendWhatsAppMessage(senderPhone, "❌ Opción no válida. Por favor, responde únicamente con un número del 1 al 4 para indicar tu inconveniente.");
        }
        const user = await prisma.tendero.findFirst({ where: { telefono: senderPhone } });
        let motivo = "Otro problema";
        if (textReceived === "1") motivo = "Producto dañado o vencido";
        if (textReceived === "2") motivo = "Faltaron productos";
        if (textReceived === "3") motivo = "Problema con la factura";

        await prisma.ticketSoporte.create({
          data: {
            motivo: motivo,
            pedidoId: currentState.orderId,
            tenderoId: user.id
          }
        });

        const codeToDisplay = currentState.orderCode || currentState.orderId;
        chatStates.delete(senderPhone);
        return sendWhatsAppMessage(senderPhone, `✅ ¡Listo! Hemos creado tu ticket de reclamo para el pedido #${codeToDisplay}. Un asesor te contactará muy pronto para solucionarlo.`);
      }
    }

    // 2. Comportamiento normal (Buscar usuario actual si no hay estado activo)
    const user = await prisma.tendero.findFirst({ where: { telefono: senderPhone } });

    if (!user) {
      if (textReceived === "1") {
        chatStates.set(senderPhone, { step: 'AWAITING_OLD_NUMBER', timestamp: Date.now() });
        await sendWhatsAppMessage(senderPhone, "¡Claro que sí! Para proteger tu cuenta, por favor escribe tu *número de celular anterior* (con el que hacías tus pedidos):");
      } else {
        const appUrl = process.env.FRONTEND_URL || 'https://proveendo.com';
        const welcomeMsg = `¡Hola! 👋 Bienvenido a *Proveendo*, tu aliado para abastecer tu tienda.\n\nVeo que es tu primera vez por aquí. Para ver todo nuestro catálogo y hacer tu primer pedido, ingresa aquí:\n🔗 ${appUrl}\n\n_Si ya eres cliente nuestro pero cambiaste de celular, responde con *1* para recuperar tu cuenta._`;
        await sendWhatsAppMessage(senderPhone, welcomeMsg);
      }
      return;
    } 

    // FLUJO DE USUARIO CONOCIDO (Menú principal)
    if (textReceived === "1") {
      const appUrl = process.env.FRONTEND_URL || 'https://proveendo.com';
      await sendWhatsAppMessage(senderPhone, `¡Excelente! 🛒 Ingresa a Proveendo para surtir tu tienda rápidamente y sin complicaciones aquí 👇\n🔗 ${appUrl}`);
    } else if (textReceived === "2") {
      const appUrl = process.env.FRONTEND_URL || 'https://proveendo.com';
      await sendWhatsAppMessage(senderPhone, `¡Aprovecha antes de que se agoten! 🎁 Descubre las ofertas especiales que tenemos hoy para ti ingresando aquí 👇\n🔗 ${appUrl}`);
    } else if (textReceived === "3") {
      // Estado de entrega
      const lastOrder = await prisma.pedido.findFirst({ where: { tenderoId: user.id }, orderBy: { fecha: 'desc' } });
      if (lastOrder) {
        let estadoStr = lastOrder.estado === 'en_ruta' ? '🟡 EN RUTA' : (lastOrder.estado === 'entregado' ? '🟢 ENTREGADO' : '⚪ PENDIENTE');
        const orderCode = lastOrder.codigo || lastOrder.id;
        await sendWhatsAppMessage(senderPhone, `Tu último pedido (Código: #${orderCode}) se encuentra actualmente: ${estadoStr}.`);
      } else {
        await sendWhatsAppMessage(senderPhone, "Actualmente no tienes pedidos registrados en el sistema.");
      }
    } else if (textReceived === "4") {
      // Soporte
      const lastOrders = await prisma.pedido.findMany({ where: { tenderoId: user.id }, orderBy: { fecha: 'desc' }, take: 3 });
      
      if (lastOrders.length === 0) {
        await prisma.ticketSoporte.create({ data: { motivo: "Consulta general", tenderoId: user.id } });
        await sendWhatsAppMessage(senderPhone, "✅ Hemos creado un ticket de soporte para ti. Un asesor te contactará pronto.");
      } else {
        chatStates.set(senderPhone, { step: 'AWAITING_ORDER_SELECTION', orders: lastOrders, timestamp: Date.now() });
        
        let msg = "¿Sobre cuál de tus últimos pedidos necesitas soporte? Responde con el número:\n";
        lastOrders.forEach((order, idx) => {
          const orderCode = order.codigo || order.id;
          msg += `*${idx + 1}️⃣* Pedido #${orderCode} ($${order.total})\n`;
        });
        msg += `*4️⃣* No es sobre un pedido específico`;
        
        await sendWhatsAppMessage(senderPhone, msg);
      }
    } else {
      const isGreeting = /^(hola|buenos|buenas|saludos|hello)/i.test(textReceived);
      const prefix = isGreeting ? `¡Hola ${user.nombre_tienda}! 👋 Qué bueno verte.` : `❌ Lo siento, no reconocí esa opción.`;
      const menuMsg = `${prefix} ¿En qué te puedo ayudar hoy? Responde únicamente con el número:\n*1️⃣* 🛒 Hacer un nuevo pedido\n*2️⃣* 🎁 Ofertas del día\n*3️⃣* 🚚 Estado de mi entrega\n*4️⃣* 🎧 Soporte / Reclamos`;
      await sendWhatsAppMessage(senderPhone, menuMsg);
    }

  } catch (error) {
    console.error("Error asíncrono procesando el mensaje de WhatsApp:", error);
  }
};

module.exports = {
  sendWhatsAppMessage,
  handleIncomingMessage
};
