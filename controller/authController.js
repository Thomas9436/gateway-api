const authService = require('../services/authService');

exports.register = async (req, res) => {
    try {
        const response = await authService.registerUser(req.body);

        if (response.status === 'success') {
            res.status(201).json({
                message: 'Utilisateur créé avec succès.',
                user: response.user
            });
        } else {
            res.status(400).json({
                message: response.message || 'Erreur de création d’utilisateur.'
            });
        }
    } catch (error) {
        console.error('Erreur dans register:', error);
        res.status(500).json({
            message: 'Erreur serveur.',
            error: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { token } = await authService.loginUser(req.body);
        res.status(200).json({ token });
    } catch (error) {
        console.error('Erreur dans login:', error);
        res.status(400).json({
            message: error.message || 'Utilisateur ou mot de passe incorrect.'
        });
    }
};
