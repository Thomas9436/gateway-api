const connectRabbitMQ = require('../../clients/rabbitmq');

const pendingResponses = new Map();

async function consumeAuthResponses() {
  const channel = await connectRabbitMQ();
  const queue = 'auth-service.queue';
  const exchange = 'user.responses';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'user.response.*');

  console.log(`Waiting for responses in queue: ${queue}...`);

  channel.consume(queue, (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());
      const { correlationId, status, message, user } = event;
  
      if (correlationId && pendingResponses.has(correlationId)) {
        const { resolve, timeout } = pendingResponses.get(correlationId);
  
        clearTimeout(timeout); // Annule le timeout
        resolve({ status, message, user }); // Résout la promesse avec la réponse
        pendingResponses.delete(correlationId); // Supprime l'entrée

      } else if (event === 'user.created') {
        console.log('Événement user.created reçu :', response.payload);
        // Ajouter une logique si nécessaire pour gérer user.created
      } else {
        console.warn(`Warning -> Événement non pris en charge: ${event.event}`);
      }
  
      channel.ack(msg); // Acquitte le message
    }
  });
}

module.exports = { consumeAuthResponses };
