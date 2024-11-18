const amqp = require('amqplib');

let connection;
let channel;

async function connectRabbitMQ() {
  if (!connection) {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
  }
  return channel;
}

module.exports = connectRabbitMQ;
