require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Contrôleurs
const quizController = require('./controllers/quiz');
const paymentController = require('./controllers/payment');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging des requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Protection des fichiers de données
app.use('/data', (req, res, next) => {
  res.status(403).json({ error: 'Accès interdit' });
});

// Routes API
app.get('/api/questions/batch', quizController.getQuestionsBatch);
app.post('/api/questions/verify', quizController.verifyAnswer);
app.get('/api/translations', quizController.getTranslations);

// Routes de paiement
app.post('/api/payment/create', paymentController.createTransaction);
app.post('/api/payment/webhook', paymentController.handleWebhook);
app.get('/api/payment/status/:transactionId', paymentController.getPaymentStatus);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Route fallback pour SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue'
      : err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;