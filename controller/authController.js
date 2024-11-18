const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    const response = await authService.registerUser(req.body);

    if (response.status === 'success') {
      res.status(201).json({ message: 'Utilisateur créé avec succès.' });
    } else {
      res.status(400).json({ message: 'Cet utilisateur existe déjà.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { token } = await authService.loginUser(req.body);
    res.status(200).json({ token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
