const { client, publishMessage } = require('../config/mqttClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const JWT_SECRET = process.env.JWT_SECRET;

// Connexion au broker MQTT
client.on('connect', () => {
    console.log('Connecté à MQTT pour authService');

    // S'abonner au topic 'user-response' pour écouter les réponses de l'API Users
    client.subscribe('user-response', (err) => {
        if (!err) console.log('Souscrit au topic user-response');
    });
});

// Utilisation d'une promesse pour gérer la réception de message unique
const waitForResponse = (email) => {
    return new Promise((resolve) => {
        client.once('message', (topic, message) => {
            if (topic === 'user-response') {
                const response = JSON.parse(message.toString());
                if (response.email === email) {
                    resolve(response);
                }
            }
        });
    });
};

// Fonction pour l'inscription des utilisateurs
exports.register = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        // Hashage du mot de passe avant de l'envoyer à l'API Users
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`Mot de passe haché pour ${email}: ${hashedPassword}`);

        // Publier l'événement d'inscription sur 'user-register'
        publishMessage(
            'user-register',
            JSON.stringify({
                firstName,
                lastName,
                email,
                password: hashedPassword
            })
        );

        // Attendre la réponse unique sur le topic 'user-response'
        const response = await waitForResponse(email);

        if (response.status === 'success') {
            res.status(201).json({ message: 'Utilisateur créé avec succès.' });
        } else {
            res.status(400).json({ message: 'Cet utilisateur existe déjà.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.', error });
    }
};

// Fonction pour la connexion des utilisateurs
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Publier l'événement de connexion sur 'user-login'
        publishMessage('user-login', JSON.stringify({ email, password }));

        // Attendre la réponse unique sur le topic 'user-response'
        const response = await waitForResponse(email);
        console.log(response);

        if (response.isMatch) {
            // Générer un token JWT en cas de succès
            const token = jwt.sign({ userId: response.userId }, JWT_SECRET, {
                expiresIn: process.env.TIMEOUT_TOKEN || '5h'
            });
            res.status(200).json({ token });
        } else {
            res.status(400).json({ message: 'Utilisateur ou mot de passe incorrect.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.', error });
    }
};
