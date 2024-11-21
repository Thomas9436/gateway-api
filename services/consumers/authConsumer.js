const connectRabbitMQ = require('../../clients/rabbitmq');

const pendingResponses = new Map();

function awaitResponse(correlationId) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingResponses.delete(correlationId);
            reject(new Error(`Timeout waiting for response with correlationId: ${correlationId}`));
        }, 5000);

        pendingResponses.set(correlationId, { resolve, timeout });
    });
}

function resolvePendingResponse({ correlationId, status, message, user }) {
    if (!pendingResponses.has(correlationId)) {
        console.warn('No pending request for correlationId:', correlationId);
        return;
    }

    const { resolve, timeout } = pendingResponses.get(correlationId);

    clearTimeout(timeout); // Annule le timeout
    resolve({ correlationId, status, message, user }); // Résout la promesse
    pendingResponses.delete(correlationId); // Nettoie la Map
}

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
            const response = JSON.parse(msg.content.toString());
            console.log('Received event:', response);

            // Vérifie explicitement si l'événement est de type `user.response`
            if (!response || response.event !== 'user.response') {
                console.warn('Ignoring event that is not a user.response:', response);
                channel.ack(msg); // Acquitte le message pour éviter les re-traitements
                return;
            }

            const { correlationId, status, message, user } = response;

            if (!correlationId) {
                console.error('Response received without correlationId:', response);
                channel.ack(msg);
                return;
            }

            // Résout la promesse en attente pour ce correlationId
            resolvePendingResponse({ correlationId, status, message, user });
            channel.ack(msg);
        }
    });
}

module.exports = {
    consumeAuthResponses,
    awaitResponse
};
