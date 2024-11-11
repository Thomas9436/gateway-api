const jwt = require('jsonwebtoken');
const User = require('../../Users-api/model/users');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

module.exports = async (req, res, next) => {
    console.log(`Middleware appelé sur la route : ${req.originalUrl}`);
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Accès non autorisé.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = decoded;
        const userId = decoded.userId;
        console.log(userId);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token invalide ou expiré.', error });
    }
};
