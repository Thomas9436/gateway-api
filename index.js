const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const app = express();
require('dotenv').config();
const connectDB = require('./database/db');
const authRoutes = require('./routes/authRoutes');
const { consumeAuthResponses } = require('./services/consumers/authConsumer');
const authService = require('./services/authService');
const { createProxyMiddleware } = require('http-proxy-middleware');

connectDB();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(authRoutes);

// Lance le consommateur pour les réponses RabbitMQ
consumeAuthResponses(authService.handleAuthResponse).catch((error) =>
    console.error('Erreur RabbitMQ:', error)
  );
  

app.use(
    cors({
        origin: '*', // Autorise toutes les origines
        methods: 'GET,POST,PUT,DELETE',
        allowedHeaders: 'Content-Type,Authorization'
    })
);

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API',
            version: '1.0.0'
        }
    },
    apis: ['./routes/**/*.js', './model/**/*.js', './swagger.js'] // Inclure les fichiers routes et swagger.js
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));


// Redirection vers l'API Users
app.use(
    '/users',
    createProxyMiddleware({
      target: 'http://localhost:4000', // 'http://users-api:4000' Docker
      changeOrigin: true,
      onProxyReq: (proxyReq, req) => {
        // Transmettre le body pour les requêtes POST
        if (req.body && Object.keys(req.body).length) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ message: 'Erreur de communication avec Users API.' });
      },
    })
  );

// Redirection vers book-management
app.use(
    '/books/manage',
    createProxyMiddleware({
        target: 'http://books-management-api:5000',
        changeOrigin: true
    })
);

// Redirection vers book-borrow-api
app.use(
    '/books/borrow',
    createProxyMiddleware({
        target: 'http://books-borrowing-api:6000',
        changeOrigin: true
    })
);

app.get('/', (req, res) => {
    res.send('Bienvenue sur mon API!');
});

app.listen(port, () => {
    console.log(`Gateway is listening on http://localhost:${port}`);
});
