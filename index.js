const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const app = express();
require('dotenv').config();
const connectDB = require('./database/db');
const routes = require('./routes/index');
const { createProxyMiddleware } = require('http-proxy-middleware');

connectDB();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(
    cors({
        origin: '*', // Autorise toutes les origines
        methods: 'GET,POST,PUT,DELETE',
        allowedHeaders: 'Content-Type,Authorization'
    })
);

app.use('/api/', routes);

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

// Redirection vers users api
app.use(
    '/users',
    createProxyMiddleware({
        target: 'http://users-api:4000',  // Docker utilise le nom 'users-api'
        changeOrigin: true
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
