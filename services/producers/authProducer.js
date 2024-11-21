const connectRabbitMQ = require('../../clients/rabbitmq');

async function publishAuthEvent(eventType, payload) {
    const channel = await connectRabbitMQ();
    const exchange = 'user.events'; // Déclare un échange pour les événements liés aux utilisateurs
    await channel.assertExchange(exchange, 'topic', { durable: true });

    const routingKey = `user.${eventType}`;
    const correlationId = payload.correlationId;

    if (!correlationId) {
        throw new Error('Missing correlationId in payload. Cannot publish event.');
    }

    const message = {
        event: routingKey,
        correlationId, // Ajout du correlationId
        payload: payload
    };

    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
    console.log(`Published event: ${routingKey}`, message);

    return correlationId; // Retourne le correlationId pour le suivi
}

module.exports = { publishAuthEvent };
