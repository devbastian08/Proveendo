require('dotenv').config();
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
client.messages.list({limit: 5})
  .then(msgs => msgs.forEach(m => console.log(m.from, m.to, m.body)))
  .catch(console.error);
