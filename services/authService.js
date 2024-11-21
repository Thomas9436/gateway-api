const jwt = require('jsonwebtoken');
const { publishAuthEvent } = require('./producers/authProducer');
const { awaitResponse } = require('../services/consumers/authConsumer');

const JWT_SECRET = process.env.JWT_SECRET;

async function registerUser({ firstName, lastName, email, password }) {
    const correlationId = Date.now().toString(); // Génère un correlationId unique
    console.log(`Initialisation du correlationId: ${correlationId}`);

    // Publier l'événement d'inscription avec le correlationId
    await publishAuthEvent('register', {
        correlationId,
        firstName,
        lastName,
        email,
        password
    });

    // Attendre la réponse associée au correlationId
    const response = await awaitResponse(correlationId);

    // Retourner la réponse pour traitement dans le contrôleur
    return response;
}

async function loginUser({ email, password }) {
    const correlationId = Date.now().toString(); // Génère un correlationId unique
    console.log(`Initialisation du correlationId pour login: ${correlationId}`);

    // Publier un événement de connexion avec un correlationId
    await publishAuthEvent('login', { correlationId, email, password });
    console.log('Mot de passe envoyé pour login:', password);

    // Attendre une réponse associée au correlationId
    const response = await awaitResponse(correlationId);
    console.log('Réponse reçue pour login:', response);

    if (response.status === 'success') {
        // Générer un token JWT
        const token = jwt.sign({ userId: response.user.id, email: response.user.email }, JWT_SECRET, {
            expiresIn: process.env.TIMEOUT_TOKEN || '5h'
        });

        return { token };
    } else {
        throw new Error(response.message);
    }
}

module.exports = { registerUser, loginUser };
