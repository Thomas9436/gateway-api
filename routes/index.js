const express = require('express');
const authRoutes = require('../routes/auth');

const router = express.Router();

router.use(authRoutes);

module.exports = router;
