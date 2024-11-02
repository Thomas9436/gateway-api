const mqtt = require('mqtt');

// Connexion à EMQX sur le port MQTT (1883)
const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'AuthGateway'
});

client.on('connect', () => {
    console.log('Connecté à EMQX');

    // S'abonner à un topic
    client.subscribe('test/topic', (err) => {
        if (!err) {
            console.log('Souscrit à test/topic');
        }
    });
});

// Recevoir les messages sur le topic
client.on('message', (topic, message) => {
    console.log(`Message reçu sur ${topic}: ${message.toString()}`);
});

// Fonction pour publier un message
function publishMessage(topic, message) {
    client.publish(topic, message, (err) => {
        if (err) {
            console.error('Erreur lors de la publication :', err);
        } else {
            console.log(`Message publié sur ${topic}: ${message}`);
        }
    });
}

module.exports = { client, publishMessage };
