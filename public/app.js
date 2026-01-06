/* État global */
const state = {
  lang: localStorage.getItem('lang') || 'fr',
  currentCategory: null,
  timer: null,
  timeLeft: 20,
  cache: {},
  sessionScore: 0,
  totalAsked: 0,
  lastQuestion: null,
  installingEvt: null
};

/* Catégories avec émojis */
const categories = [
  { key: 'Histoire africaine', emoji: '📜', desc: { fr: 'Empires et figures historiques', en: 'Empires and historical figures' } },
  { key: 'Géographie', emoji: '🗺️', desc: { fr: 'Pays et capitales', en: 'Countries and capitals' } },
  { key: 'Langues et ethnies', emoji: '🗣️', desc: { fr: 'Diversité linguistique', en: 'Linguistic diversity' } },
  { key: 'Musique et danse', emoji: '🥁', desc: { fr: 'Styles et artistes', en: 'Styles and artists' } },
  { key: 'Cuisine africaine', emoji: '🍲', desc: { fr: 'Plats et traditions', en: 'Dishes and traditions' } },
  { key: 'Littérature et arts', emoji: '📖', desc: { fr: 'Auteurs et œuvres', en: 'Authors and works' } },
  { key: 'Sport', emoji: '⚽', desc: { fr: 'Athlètes et compétitions', en: 'Athletes and competitions' } },
  { key: 'Mythes et croyances', emoji: '🔮', desc: { fr: 'Rites et symboles', en: 'Rites and symbols' } },
  { key: 'Personnalités contemporaines', emoji: '👤', desc: { fr: 'Leaders et artistes', en: 'Leaders and artists' } },
  { key: 'Culture populaire et cinéma', emoji: '🎬', desc: { fr: 'Films et tendances', en: 'Films and trends' } }
];

/* Traductions */
const t = {
  fr: {
    appTitle: '🌍 Quiz Culturel Africain',
    appSubtitle: 'Explore la richesse culturelle du continent',
    categoriesTitle: '📚 Catégories',
    mix: '🎲 Mode Mix',
    next: '➡️ Suivant',
    resultsTitle: '🏆 Résultats',
    scoreLine: (score, total) => `Score: ${score}/${total}`,
    supportTitle: '💳 Soutenir via FedaPay',
    restart: '🔄 Rejouer',
    langBtn: '🇫🇷 FR',
    install: '📱 Installer l’app'
  },
  en: {
    appTitle: '🌍 African Cultural Quiz',
    appSubtitle: 'Explore the continent’s rich culture',
    categoriesTitle: '📚 Categories',
    mix: '🎲 Mix Mode',
    next: '➡️ Next',
    resultsTitle: '🏆 Results',
    scoreLine: (score, total) => `Score: ${score}/${total}`,
    supportTitle: '💳 Support via FedaPay',
    restart: '🔄 Play again',
    langBtn: '🇬🇧 EN',
    install: '📱 Install app'
  }
};

/* Initialisation */
document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  renderText();
  renderCategories();
});

/* Liaison sécurisée des boutons (évite erreurs si un id manque) */
function bindUI() {
  const byId = (id) => document.getElementById(id);

  const langSwitch = byId('lang-switch');
  if (langSwitch) {
    langSwitch.addEventListener('click', () => {
      state.lang = state.lang === 'fr' ? 'en' : 'fr';
      localStorage.setItem('lang', state.lang);
      renderText();
      renderCategories();
    });
  }

  const mixBtn = byId('mix-mode-btn');
  if (mixBtn) mixBtn.addEventListener('click', () => startQuiz('mix'));

  const nextBtn = byId('next-btn');
  if (nextBtn) nextBtn.addEventListener('click', () => loadNextQuestion());

  const restartBtn = byId('restart-btn');
  if (restartBtn) restartBtn.addEventListener('click', () => resetQuiz());

  document.querySelectorAll('.support-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const amount = Number(e.currentTarget.dataset.amount);
      await createFedaPayPayment(amount);
    });
  });

  const installBtn = byId('install-btn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installingEvt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (state.installingEvt) {
        state.installingEvt.prompt();
        const res = await state.installingEvt.userChoice;
        if (res.outcome === 'accepted') installBtn.hidden = true;
      }
    });
  }
}

/* Texte selon langue */
function renderText() {
  const i18n = t[state.lang];
  setText('app-title', i18n.appTitle);
  setText('app-subtitle', i18n.appSubtitle);
  setText('categories-title', i18n.categoriesTitle);
  setText('mix-mode-btn', i18n.mix);
  setText('next-btn', i18n.next);
  setText('results-title', i18n.resultsTitle);
  setText('support-title', i18n.supportTitle);
  setText('restart-btn', i18n.restart);
  setText('lang-switch', i18n.langBtn);
  setText('install-btn', i18n.install);

  if (state.lastQuestion) {
    setText('quiz-category-title',
      state.currentCategory === 'mix' ? (state.lang === 'fr' ? '🎲 Mode Mix' : '🎲 Mix Mode') : `🎯 ${state.currentCategory}`);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* Rendu catégories */
function renderCategories() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;
  grid.innerHTML = '';
  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${cat.emoji} ${cat.key}</h3>
      <p>${state.lang === 'fr' ? cat.desc.fr : cat.desc.en}</p>
    `;
    card.addEventListener('click', () => startQuiz(cat.key));
    grid.appendChild(card);
  });
}

/* Démarre un quiz */
function startQuiz(categoryKey) {
  state.currentCategory = categoryKey;
  state.sessionScore = 0;
  state.totalAsked = 0;
  state.lastQuestion = null;

  const quiz = document.getElementById('quiz-section');
  const results = document.getElementById('results-section');
  if (results) results.hidden = true;
  if (quiz) quiz.hidden = false;

  setText('quiz-category-title',
    categoryKey === 'mix' ? (state.lang === 'fr' ? '🎲 Mode Mix' : '🎲 Mix Mode') : `🎯 ${categoryKey}`);

  preloadCache(categoryKey).then(() => loadNextQuestion());
}

/* Précharge 10 questions pour performance */
async function preloadCache(categoryKey) {
  const cacheKey = `${state.lang}:${categoryKey}`;
  if (state.cache[cacheKey] && state.cache[cacheKey].length >= 10) return;

  const questions = [];
  for (let i = 0; i < 10; i++) {
    const q = await fetchQuestion(state.lang, categoryKey);
    if (q) questions.push(q);
  }
  state.cache[cacheKey] = questions;
  localStorage.setItem(`cache:${cacheKey}`, JSON.stringify(questions));
}

/* Charge question suivante */
async function loadNextQuestion() {
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.disabled = true;

  const cacheKey = `${state.lang}:${state.currentCategory}`;
  let bank = state.cache[cacheKey] || JSON.parse(localStorage.getItem(`cache:${cacheKey}`) || '[]');

  let q = null;
  if (bank.length > 0) {
    q = bank.shift();
    state.cache[cacheKey] = bank;
    localStorage.setItem(`cache:${cacheKey}`, JSON.stringify(bank));
  } else {
    q = await fetchQuestion(state.lang, state.currentCategory);
  }

  if (!q) return finishQuiz();

  state.lastQuestion = q;
  renderQuestion(q);
  startTimer(20);
}

/* Affiche une question */
function renderQuestion(q) {
  setText('question-text', q.text);
  const answersDiv = document.getElementById('answers');
  if (!answersDiv) return;
  answersDiv.innerHTML = '';
  const shuffled = shuffle([...q.answers]);
  shuffled.forEach(ans => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = ans;
    btn.addEventListener('click', () => handleAnswer(btn, ans, q.correct));
    answersDiv.appendChild(btn);
  });
}

/* Gestion réponse */
function handleAnswer(btn, chosen, correct) {
  stopTimer();
  const answersDiv = document.getElementById('answers');
  if (!answersDiv) return;
  const buttons = Array.from(answersDiv.querySelectorAll('.answer-btn'));
  buttons.forEach(b => {
    if (b.textContent === correct) b.classList.add('correct');
    else if (b === btn && chosen !== correct) b.classList.add('wrong');
    b.disabled = true;
  });

  state.totalAsked += 1;
  if (chosen === correct) state.sessionScore += 1;

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent = state.totalAsked >= 10
      ? (state.lang === 'fr' ? '✅ Terminer' : '✅ Finish')
      : (state.lang === 'fr' ? '➡️ Suivant' : '➡️ Next');
  }
}

/* Timer */
function startTimer(seconds) {
  state.timeLeft = seconds;
  updateTimer();
  state.timer = setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      stopTimer();
      const q = state.lastQuestion;
      const answersDiv = document.getElementById('answers');
      if (answersDiv && q) {
        const buttons = Array.from(answersDiv.querySelectorAll('.answer-btn'));
        buttons.forEach(b => {
          if (b.textContent === q.correct) b.classList.add('correct');
          else b.classList.add('wrong');
          b.disabled = true;
        });
      }
      state.totalAsked += 1;
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) {
        nextBtn.disabled = false;
        if (state.totalAsked >= 10) {
          nextBtn.textContent = state.lang === 'fr' ? '✅ Terminer' : '✅ Finish';
        }
      }
    } else {
      updateTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function updateTimer() {
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = `⏱️ ${state.timeLeft}s`;
}

/* API questions */
async function fetchQuestion(lang, category) {
  const params = new URLSearchParams({ lang, category });
  try {
    const res = await fetch(`/api/next-question?${params.toString()}`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* Fin du quiz */
function finishQuiz() {
  stopTimer();
  const quiz = document.getElementById('quiz-section');
  const results = document.getElementById('results-section');
  if (quiz) quiz.hidden = true;
  if (results) results.hidden = false;
  setText('score-line', t[state.lang].scoreLine(state.sessionScore, state.totalAsked));
  renderLeaderboard();
}

/* Reset */
function resetQuiz() {
  stopTimer();
  const quiz = document.getElementById('quiz-section');
  const results = document.getElementById('results-section');
  if (quiz) quiz.hidden = true;
  if (results) results.hidden = true;
  setText('next-btn', t[state.lang].next);
}

/* Leaderboard local */
function renderLeaderboard() {
  const key = 'leaderboard';
  const record = JSON.parse(localStorage.getItem(key) || '[]');
  record.push({
    date: new Date().toISOString(),
    score: state.sessionScore,
    total: state.totalAsked,
    category: state.currentCategory,
    lang: state.lang
  });
  record.splice(0, Math.max(0, record.length - 5));
  localStorage.setItem(key, JSON.stringify(record));

  const container = document.getElementById('leaderboard');
  if (!container) return;
  container.innerHTML = '';
  record.forEach((r, idx) => {
    const p = document.createElement('p');
    p.textContent = `#${idx + 1} — ${r.score}/${r.total} — ${r.category} — ${r.lang.toUpperCase()} (${new Date(r.date).toLocaleString()})`;
    container.appendChild(p);
  });
}

/* Paiement FedaPay (placeholder sécurisé) */
async function createFedaPayPayment(amount) {
  const status = document.getElementById('payment-status');
  if (status) status.textContent = state.lang === 'fr' ? '⏳ Création du paiement...' : '⏳ Creating payment...';
  try {
    const res = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    if (!res.ok) {
      if (status) status.textContent = state.lang === 'fr' ? '❌ Erreur de paiement.' : '❌ Payment error.';
      return;
    }
    const data = await res.json();
    if (data && data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else {
      if (status) status.textContent = state.lang === 'fr' ? '✅ Paiement initié.' : '✅ Payment initiated.';
    }
  } catch {
    if (status) status.textContent = state.lang === 'fr' ? '❌ Connexion au paiement impossible.' : '❌ Unable to connect to payment.';
  }
}

/* Helpers */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}