const express = require('express');
const path = require('path');
const cors = require('cors');

const quizController = require('./controllers/quiz');
const paymentController = require('./controllers/payment');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.get('/api/next-question', quizController.nextQuestion);
app.post('/api/payment/create', paymentController.createPayment);

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback (corrigé)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});