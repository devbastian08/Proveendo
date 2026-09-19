require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !twilioNumber) {
  console.error("Faltan variables de entorno para Twilio en .env");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function test() {
  try {
    const response = await client.messages.create({
      body: "Este es un mensaje de prueba desde el servidor (Test Directo)",
      from: twilioNumber,
      to: 'whatsapp:+573157986475'
    });
    console.log("¡Éxito! Mensaje enviado. SID:", response.sid);
  } catch (error) {
    console.error("Error al enviar el mensaje:");
    console.error(error);
  }
}

test();
