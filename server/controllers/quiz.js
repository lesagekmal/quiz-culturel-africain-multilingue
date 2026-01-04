const fs = require('fs').promises;
const path = require('path');

// Cache en mémoire pour les performances
let questionsCache = {
  fr: null,
  en: null,
  lastUpdate: null
};

const CACHE_DURATION = process.env.CACHE_DURATION || 3600000; // 1 heure

class QuizController {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
  }

  async loadQuestions(lang = 'fr') {
    const now = Date.now();
    
    // Vérifier le cache
    if (questionsCache[lang] && 
        questionsCache.lastUpdate && 
        (now - questionsCache.lastUpdate) < CACHE_DURATION) {
      return questionsCache[lang];
    }

    try {
      const filePath = path.join(this.dataPath, `questions_${lang}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const questions = JSON.parse(data);

      // Validation du format
      this.validateQuestionsFormat(questions);

      // Mettre en cache
      questionsCache[lang] = questions;
      questionsCache.lastUpdate = now;

      return questions;
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      throw new Error('Impossible de charger les questions');
    }
  }

  validateQuestionsFormat(questions) {
    if (!Array.isArray(questions)) {
      throw new Error('Les questions doivent être un tableau');
    }

    questions.forEach((q, index) => {
      const requiredFields = ['text', 'answers', 'correct', 'category'];
      const missingFields = requiredFields.filter(field => !(field in q));
      
      if (missingFields.length > 0) {
        throw new Error(`Question ${index} manque: ${missingFields.join(', ')}`);
      }

      if (!Array.isArray(q.answers) || q.answers.length !== 4) {
        throw new Error(`Question ${index}: answers doit être un tableau de 4 éléments`);
      }

      if (!q.answers.includes(q.correct)) {
        throw new Error(`Question ${index}: correct doit être dans answers`);
      }

      if (typeof q.text !== 'string' || q.text.trim() === '') {
        throw new Error(`Question ${index}: text doit être une chaîne non vide`);
      }

      if (typeof q.category !== 'string' || q.category.trim() === '') {
        throw new Error(`Question ${index}: category doit être une chaîne non vide`);
      }
    });
  }

  async getQuestionsBatch(req, res) {
    try {
      const { lang = 'fr', count = 10, categories = '' } = req.query;
      const countNum = parseInt(count, 10);
      
      // Validation des paramètres
      if (countNum < 1 || countNum > 50) {
        return res.status(400).json({ 
          error: 'Le nombre de questions doit être entre 1 et 50' 
        });
      }

      if (!['fr', 'en'].includes(lang)) {
        return res.status(400).json({ 
          error: 'Langue non supportée. Utilisez fr ou en' 
        });
      }

      // Charger les questions
      const allQuestions = await this.loadQuestions(lang);
      
      // Filtrer par catégories si spécifié
      let filteredQuestions = allQuestions;
      if (categories) {
        const categoryList = categories.split(',').map(c => c.trim());
        filteredQuestions = allQuestions.filter(q => 
          categoryList.includes(q.category)
        );
        
        if (filteredQuestions.length === 0) {
          return res.status(404).json({ 
            error: 'Aucune question trouvée pour ces catégories' 
          });
        }
      }

      // Sélectionner aléatoirement
      const shuffled = [...filteredQuestions]
        .sort(() => 0.5 - Math.random())
        .slice(0, countNum);

      // NE JAMAIS ENVOYER LA RÉPONSE CORRECTE
      const safeQuestions = shuffled.map(q => ({
        text: q.text,
        answers: this.shuffleArray([...q.answers]), // Mélanger les réponses
        category: q.category
        // 'correct' est intentionnellement omis
      }));

      res.json(safeQuestions);
    } catch (error) {
      console.error('Erreur getQuestionsBatch:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  async verifyAnswer(req, res) {
    try {
      const { questionText, answer, lang = 'fr' } = req.body;

      if (!questionText || !answer) {
        return res.status(400).json({ 
          error: 'questionText et answer sont requis' 
        });
      }

      const questions = await this.loadQuestions(lang);
      const question = questions.find(q => q.text === questionText);

      if (!question) {
        return res.status(404).json({ 
          error: 'Question non trouvée' 
        });
      }

      // Vérifier la réponse
      const isCorrect = question.correct === answer;

      res.json({
        correct: isCorrect,
        correctAnswer: isCorrect ? null : question.correct // Ne pas révéler en cas d'erreur
      });
    } catch (error) {
      console.error('Erreur verifyAnswer:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  async getTranslations(req, res) {
    try {
      const { lang = 'fr' } = req.query;
      const filePath = path.join(this.dataPath, 'translations.json');
      
      const data = await fs.readFile(filePath, 'utf8');
      const translations = JSON.parse(data);

      if (!translations[lang]) {
        return res.status(400).json({ 
          error: 'Langue non supportée' 
        });
      }

      res.json(translations[lang]);
    } catch (error) {
      console.error('Erreur getTranslations:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Méthode pour rafraîchir le cache (à appeler périodiquement)
  async refreshCache() {
    try {
      console.log('Rafraîchissement du cache des questions...');
      questionsCache.fr = null;
      questionsCache.en = null;
      await this.loadQuestions('fr');
      await this.loadQuestions('en');
      console.log('Cache rafraîchi avec succès');
    } catch (error) {
      console.error('Erreur rafraîchissement cache:', error);
    }
  }
}

module.exports = new QuizController();