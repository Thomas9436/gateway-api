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
const { fixRequestBody, createProxyMiddleware } = require('http-proxy-middleware');

connectDB();
const port = process.env.PORT || 3000;

// Middleware JSON conditionnel pour routes natives uniquement
const isNativeRoute = (req) => ['/register', '/login'].includes(req.path);

app.use((req, res, next) => {
  if (isNativeRoute(req)) {
    express.json()(req, res, next); // Appliquer express.json() uniquement aux routes natives car createProxyMiddleware doit consommer une requête brute (raw) et non req.body
  } else {
    next(); // Ignorer pour les proxys
  }
});

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
      target: 'http://users-api:4000', // 'http://localhost:4000'
      changeOrigin: true,
      onProxyReq: fixRequestBody, // Réécrit le corps de la requête avant de la transmettre
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ message: 'Erreur de communication avec Users API.' });
      },
    })
  );

app.use(
  '/books/manage',
  createProxyMiddleware({
    target: 'http://books-management-api:5000', // 'http://localhost:5000'
    changeOrigin: true,
    onProxyReq: fixRequestBody, // Réécrit le corps de la requête avant de la transmettre
    onError: (err, req, res) => {
      console.error('Erreur de proxy :', err.message);
      res.status(502).json({
        message: 'Erreur de communication avec book-management.',
        error: err.message,
      });
    },
  })
);

// Redirection vers book-borrow-api
app.use(
    '/books/borrow',
    createProxyMiddleware({
        target: 'http://books-borrowing-api:6000', // 'http://localhost:6000'
        changeOrigin: true,
        onProxyReq: fixRequestBody, // Réécrit le corps de la requête avant de la transmettre
        onError: (err, req, res) => {
          console.error('Erreur de proxy :', err.message);
          res.status(502).json({
            message: 'Erreur de communication avec book-management.',
            error: err.message,
          });
    },
    })
);

app.get('/', (req, res) => {
    res.send('Bienvenue sur mon API!');
});

app.listen(port, () => {
    console.log(`Gateway is listening on http://localhost:${port}`);
});
