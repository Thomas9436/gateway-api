const jwt = require('jsonwebtoken');
const client = require('../config/mqttClient');
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
    console.log(`Middleware appelé sur la route : ${req.originalUrl}`);
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Accès non autorisé.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        // Publier un message pour demander les informations de l’utilisateur
        client.publish('user/request', JSON.stringify({ userId }));

        // Timeout en cas d'absence de réponse
        const timeout = setTimeout(() => {
            client.off('message', onMessage); // Nettoyage
            return res.status(504).json({ message: 'User service timeout' });
        }, 5000); // Par exemple, 5 secondes

        // Fonction de traitement de la réponse
        const onMessage = (topic, message) => {
            if (topic === `user/response/${userId}`) {
                clearTimeout(timeout); // Annule le timeout
                const user = JSON.parse(message.toString());

                if (!user) {
                    client.off('message', onMessage); // Nettoyage
                    return res.status(404).json({ message: 'User not found' });
                }

                req.user = user;
                client.off('message', onMessage); // Nettoyage
                next();
            }
        };

        // S'abonner pour recevoir la réponse de l'API Users
        client.on('message', onMessage);
        client.subscribe(`user/response/${userId}`);

        // Événement MQTT pour un log
        client.publish('logs', JSON.stringify({ path: req.path, method: req.method }));
    } catch (error) {
        return res.status(401).json({ message: 'Token invalide ou expiré.', error });
    }
};

module.exports = authMiddleware;
