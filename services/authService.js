const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { publishAuthEvent } = require('./producers/authProducer');

const JWT_SECRET = process.env.JWT_SECRET;
const pendingResponses = new Map();

async function registerUser({ firstName, lastName, email, password }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  // Publier un événement d'inscription avec un correlationId
  const correlationId = await publishAuthEvent('register', {
    firstName,
    lastName,
    email,
    password: hashedPassword
  });

  // Attendre une réponse associée au correlationId
  const response = await awaitResponse(correlationId);

  return response;
}

async function loginUser({ email, password }) {
  // Publier un événement de connexion avec un correlationId
  const correlationId = await publishAuthEvent('login', { email, password });

  try {
    // Attendre une réponse associée au correlationId
    const response = await awaitResponse(correlationId);

    if (response.status === 'success') {
      // Générer un token JWT
      const token = jwt.sign({ userId: response.userId }, JWT_SECRET, {
        expiresIn: process.env.TIMEOUT_TOKEN || '5h',
      });
      return { token };
    } else {
      throw new Error(response.message); // Utilise le message de l'API Users
    }
  } catch (error) {
    console.error('Erreur dans loginUser:', error);
    throw new Error('Utilisateur ou mot de passe incorrect.');
  }
}

// Fonction utilitaire pour générer un ID unique
function awaitResponse(correlationId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResponses.delete(correlationId);
      reject(new Error(`Timeout waiting for response with correlationId: ${correlationId}`));
    }, 5000); // Timeout de 5 secondes

    pendingResponses.set(correlationId, { resolve, timeout });
  });
}

module.exports = { registerUser, loginUser, awaitResponse };
