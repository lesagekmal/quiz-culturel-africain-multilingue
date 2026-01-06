const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Safe in-memory store
let store = {
  fr: null,
  en: null
};

// Lazy load to avoid exposing public JSON directly
function loadData(lang) {
  if (lang === 'fr' && !store.fr) {
    const frPath = path.join(DATA_DIR, 'questions_fr.json');
    store.fr = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
  }
  if (lang === 'en' && !store.en) {
    const enPath = path.join(DATA_DIR, 'questions_eng.json');
    store.en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  }
}

function filterByCategory(list, category) {
  if (!category || category === 'mix') return list;
  return list.filter(q => q.category === category);
}

function pickRandom(list) {
  if (!list || list.length === 0) return null;
  const i = Math.floor(Math.random() * list.length);
  return list[i];
}

// GET /api/next-question?lang=fr&category=cuisine
exports.nextQuestion = (req, res) => {
  const lang = (req.query.lang || 'fr').toLowerCase();
  const category = req.query.category || 'mix';

  if (!['fr', 'en'].includes(lang)) {
    return res.status(400).json({ error: 'Invalid lang' });
  }

  try {
    loadData(lang);
    const list = lang === 'fr' ? store.fr : store.en;
    const pool = filterByCategory(list, category);
    const q = pickRandom(pool);
    if (!q) return res.status(404).json({ error: 'No questions available' });

    // Return only the fields necessary
    res.json({
      text: q.text,
      answers: q.answers,
      correct: q.correct,
      category: q.category
    });
  } catch (e) {
    console.error('Error serving question', e);
    res.status(500).json({ error: 'Failed to load question' });
  }
};