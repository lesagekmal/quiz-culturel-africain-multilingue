class QuizApp {
    constructor() {
        this.currentLang = 'fr';
        this.currentScreen = 'home';
        this.selectedCategories = new Set();
        this.selectedMode = 'normal';
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.totalTime = 0;
        this.timer = null;
        this.timeLeft = 20;
        this.isTimerRunning = false;
        this.questions = [];
        this.currentQuestion = null;
        this.quizStarted = false;
        this.quizHistory = [];
        this.cachedQuestions = [];
        
        this.initializeApp();
    }

    async initializeApp() {
        // Charger les traductions
        await this.loadTranslations();
        
        // Initialiser les écouteurs d'événements
        this.setupEventListeners();
        
        // Charger les catégories
        this.loadCategories();
        
        // Charger le classement
        this.loadLeaderboard();
        
        // Initialiser le cache
        await this.initCache();
        
        // Initialiser le service worker pour PWA
        this.registerServiceWorker();
        
        // Vérifier la connexion
        this.checkOnlineStatus();
    }

    async loadTranslations() {
        try {
            const response = await fetch('/api/translations?lang=' + this.currentLang);
            this.translations = await response.json();
            this.updateTexts();
        } catch (error) {
            console.error('Erreur chargement traductions:', error);
            // Fallback aux traductions par défaut
            this.translations = {
                fr: require('./translations/fr.json'),
                en: require('./translations/en.json')
            };
        }
    }

    updateTexts() {
        // Mettre à jour tous les textes avec data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
                element.textContent = this.translations[this.currentLang][key];
            }
        });

        // Mettre à jour les placeholders
        document.querySelectorAll('[data-i18n-ph]').forEach(element => {
            const key = element.getAttribute('data-i18n-ph');
            if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
                element.placeholder = this.translations[this.currentLang][key];
            }
        });
    }

    setupEventListeners() {
        // Sélecteur de langue
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                this.switchLanguage(lang);
            });
        });

        // Sélection des catégories
        document.querySelector('.categories-grid').addEventListener('click', (e) => {
            const categoryCard = e.target.closest('.category-card');
            if (categoryCard) {
                this.toggleCategory(categoryCard);
            }
        });

        // Sélection du mode
        document.getElementById('normal-mode').addEventListener('click', () => {
            this.selectMode('normal');
        });

        document.getElementById('training-mode').addEventListener('click', () => {
            this.selectMode('training');
        });

        // Démarrer le quiz
        document.getElementById('start-quiz').addEventListener('click', async () => {
            if (this.selectedCategories.size === 0) {
                this.showNotification('Sélectionnez au moins une catégorie', 'error');
                return;
            }
            await this.startQuiz();
        });

        // Boutons de don
        document.querySelectorAll('.donation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.target.dataset.amount;
                this.openPaymentModal(amount);
            });
        });

        // Modal de paiement
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closePaymentModal();
        });

        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', (e) => {
                this.selectPaymentMethod(e.target.closest('.payment-method').dataset.method);
            });
        });

        document.getElementById('confirm-payment').addEventListener('click', () => {
            this.processPayment();
        });

        // Gestion des réponses
        document.getElementById('answers-container').addEventListener('click', (e) => {
            const answerBtn = e.target.closest('.answer-btn');
            if (answerBtn && !this.answerSelected) {
                this.selectAnswer(answerBtn);
            }
        });

        // Question suivante
        document.getElementById('next-question').addEventListener('click', () => {
            this.nextQuestion();
        });

        // Rejouer
        document.getElementById('play-again').addEventListener('click', () => {
            this.restartQuiz();
        });

        // Retour à l'accueil
        document.getElementById('back-home').addEventListener('click', () => {
            this.showScreen('home');
        });

        // Partager
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.target.closest('.share-btn').dataset.platform;
                if (platform === 'copy-link') {
                    this.copyToClipboard();
                } else {
                    this.shareScore(platform);
                }
            });
        });

        // Gestion online/offline
        window.addEventListener('online', () => {
            this.syncCachedQuestions();
            this.showNotification('Connexion rétablie', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('Mode hors ligne activé', 'warning');
        });
    }

    async initCache() {
        // Vérifier si IndexedDB est disponible
        if ('indexedDB' in window) {
            this.db = await this.openDatabase();
        }
        
        // Charger depuis localStorage en fallback
        const cached = localStorage.getItem('quizCache');
        if (cached) {
            this.cachedQuestions = JSON.parse(cached);
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('QuizCache', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('questions')) {
                    db.createObjectStore('questions', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async loadQuestionsFromServer() {
        try {
            const categories = Array.from(this.selectedCategories);
            const response = await fetch(
                `/api/questions/batch?lang=${this.currentLang}&count=10&categories=${encodeURIComponent(categories.join(','))}`
            );
            
            if (!response.ok) throw new Error('Erreur serveur');
            
            const questions = await response.json();
            
            // Ajouter un ID unique à chaque question
            questions.forEach((q, index) => {
                q.id = `q${Date.now()}_${index}`;
                q.received = new Date().toISOString();
            });
            
            // Mettre en cache
            await this.cacheQuestions(questions);
            
            return questions;
        } catch (error) {
            console.error('Erreur chargement questions:', error);
            throw error;
        }
    }

    async cacheQuestions(questions) {
        // Mettre en cache dans IndexedDB si disponible
        if (this.db) {
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');
            
            questions.forEach(question => {
                store.put(question);
            });
            
            await transaction.complete;
        }
        
        // Mettre en cache dans localStorage (limité à 50 questions)
        this.cachedQuestions = [...this.cachedQuestions, ...questions]
            .sort((a, b) => new Date(b.received) - new Date(a.received))
            .slice(0, 50);
        
        localStorage.setItem('quizCache', JSON.stringify(this.cachedQuestions));
    }

    async getNextQuestion() {
        // Essayer d'abord de charger depuis le serveur
        if (navigator.onLine && this.questions.length < 3) {
            try {
                const newQuestions = await this.loadQuestionsFromServer();
                this.questions.push(...newQuestions);
            } catch (error) {
                console.log('Utilisation du cache offline');
            }
        }
        
        // Si pas de questions en ligne, utiliser le cache
        if (this.questions.length === 0 && this.cachedQuestions.length > 0) {
            this.questions = this.getRandomCachedQuestions(10);
        }
        
        // Si toujours pas de questions, erreur
        if (this.questions.length === 0) {
            throw new Error('Aucune question disponible');
        }
        
        return this.questions[this.currentQuestionIndex];
    }

    getRandomCachedQuestions(count) {
        const shuffled = [...this.cachedQuestions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async startQuiz() {
        this.quizStarted = true;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.totalTime = 0;
        this.questions = [];
        
        try {
            // Charger le premier lot de questions
            await this.loadQuestionsFromServer();
            
            // Afficher l'écran du quiz
            this.showScreen('quiz');
            
            // Charger la première question
            await this.loadQuestion();
            
            // Démarrer le timer si mode normal
            if (this.selectedMode === 'normal') {
                this.startTimer();
            }
        } catch (error) {
            this.showNotification('Erreur de chargement des questions', 'error');
            console.error(error);
        }
    }

    async loadQuestion() {
        try {
            this.currentQuestion = await this.getNextQuestion();
            
            if (!this.currentQuestion) {
                throw new Error('Question non disponible');
            }
            
            // Mettre à jour l'interface
            document.getElementById('question-text').textContent = this.currentQuestion.text;
            document.getElementById('current-category').textContent = this.currentQuestion.category;
            document.getElementById('question-counter').textContent = 
                `Question ${this.currentQuestionIndex + 1}/10`;
            
            // Mettre à jour la barre de progression
            const progress = ((this.currentQuestionIndex) / 10) * 100;
            document.getElementById('progress-fill').style.width = `${progress}%`;
            
            // Afficher les réponses
            this.displayAnswers();
            
            // Réinitialiser l'état de sélection
            this.answerSelected = false;
            document.getElementById('next-question').disabled = true;
            
        } catch (error) {
            console.error('Erreur chargement question:', error);
            this.showNotification('Impossible de charger la question', 'error');
        }
    }

    displayAnswers() {
        const container = document.getElementById('answers-container');
        container.innerHTML = '';
        
        this.currentQuestion.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.className = 'answer-btn';
            button.innerHTML = `
                <div class="answer-number">${index + 1}</div>
                <span>${answer}</span>
            `;
            button.dataset.answer = answer;
            container.appendChild(button);
        });
    }

    async selectAnswer(button) {
        if (this.answerSelected) return;
        
        this.answerSelected = true;
        const selectedAnswer = button.dataset.answer;
        
        // Vérifier la réponse avec le serveur
        const isCorrect = await this.verifyAnswer(selectedAnswer);
        
        // Mettre à jour l'interface
        button.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        if (isCorrect) {
            this.score += this.calculateScore();
            this.correctAnswers++;
            this.showNotification('Bonne réponse!', 'success');
        } else {
            this.showNotification('Mauvaise réponse', 'error');
            
            // Afficher la bonne réponse
            document.querySelectorAll('.answer-btn').forEach(btn => {
                if (btn.dataset.answer === this.currentQuestion.correct) {
                    btn.classList.add('correct');
                }
            });
        }
        
        // Activer le bouton suivant
        document.getElementById('next-question').disabled = false;
        
        // Arrêter le timer
        if (this.selectedMode === 'normal') {
            clearInterval(this.timer);
            this.isTimerRunning = false;
        }
        
        // Enregistrer dans l'historique
        this.quizHistory.push({
            question: this.currentQuestion.text,
            selected: selectedAnswer,
            correct: this.currentQuestion.correct,
            isCorrect: isCorrect,
            timeSpent: 20 - this.timeLeft
        });
    }

    async verifyAnswer(selectedAnswer) {
        try {
            const response = await fetch('/api/questions/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    questionText: this.currentQuestion.text,
                    answer: selectedAnswer,
                    lang: this.currentLang
                })
            });
            
            const result = await response.json();
            return result.correct;
        } catch (error) {
            console.error('Erreur vérification réponse:', error);
            // Fallback : vérifier localement si la question est en cache
            return selectedAnswer === this.currentQuestion.correct;
        }
    }

    calculateScore() {
        let baseScore = 100;
        
        // Bonus pour réponse rapide (mode normal seulement)
        if (this.selectedMode === 'normal' && this.timeLeft > 10) {
            baseScore += 50;
        } else if (this.selectedMode === 'normal' && this.timeLeft > 5) {
            baseScore += 25;
        }
        
        return baseScore;
    }

    async nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex >= 10) {
            await this.finishQuiz();
        } else {
            if (this.selectedMode === 'normal') {
                this.resetTimer();
                this.startTimer();
            }
            await this.loadQuestion();
        }
    }

    async finishQuiz() {
        this.showScreen('results');
        
        // Calculer le temps total
        const totalTime = this.quizHistory.reduce((sum, q) => sum + q.timeSpent, 0);
        
        // Mettre à jour l'affichage
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('correct-count').textContent = `${this.correctAnswers}/10`;
        document.getElementById('time-spent').textContent = `${totalTime}s`;
        
        // Calculer la meilleure catégorie
        const categoryStats = this.calculateCategoryStats();
        const bestCategory = Object.entries(categoryStats)
            .sort((a, b) => b[1] - a[1])[0];
        
        document.getElementById('best-category').textContent = 
            bestCategory ? bestCategory[0] : '-';
        
        // Sauvegarder le score
        this.saveScore();
    }

    calculateCategoryStats() {
        const stats = {};
        
        this.quizHistory.forEach((q, index) => {
            const category = this.questions[index]?.category;
            if (category) {
                if (!stats[category]) stats[category] = { correct: 0, total: 0 };
                stats[category].total++;
                if (q.isCorrect) stats[category].correct++;
            }
        });
        
        return Object.fromEntries(
            Object.entries(stats).map(([cat, data]) => [cat, data.correct / data.total])
        );
    }

    saveScore() {
        const playerName = prompt('Entrez votre nom pour le classement:', 'Joueur');
        if (!playerName) return;
        
        const scoreData = {
            name: playerName,
            score: this.score,
            correct: this.correctAnswers,
            time: this.totalTime,
            date: new Date().toISOString(),
            mode: this.selectedMode
        };
        
        // Récupérer les scores existants
        const scores = JSON.parse(localStorage.getItem('quizScores') || '[]');
        scores.push(scoreData);
        
        // Trier et garder les 10 meilleurs
        scores.sort((a, b) => b.score - a.score);
        const top10 = scores.slice(0, 10);
        
        localStorage.setItem('quizScores', JSON.stringify(top10));
        
        // Mettre à jour l'affichage
        this.loadLeaderboard();
    }

    loadLeaderboard() {
        const scores = JSON.parse(localStorage.getItem('quizScores') || '[]');
        const container = document.getElementById('leaderboard-list');
        
        if (scores.length === 0) {
            container.innerHTML = '<p class="no-scores">Aucun score enregistré</p>';
            return;
        }
        
        container.innerHTML = scores.map((score, index) => `
            <div class="leaderboard-item">
                <span class="rank">${index + 1}</span>
                <span class="player-name">${score.name}</span>
                <span class="player-score">${score.score} pts</span>
            </div>
        `).join('');
    }

    // Méthodes pour le timer
    startTimer() {
        if (this.selectedMode !== 'normal' || this.isTimerRunning) return;
        
        this.isTimerRunning = true;
        this.timeLeft = 20;
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleTimeUp();
            }
        }, 1000);
    }

    resetTimer() {
        clearInterval(this.timer);
        this.isTimerRunning = false;
        this.timeLeft = 20;
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        timerElement.textContent = this.timeLeft;
        
        // Changer la couleur selon le temps restant
        timerElement.classList.remove('warning', 'danger');
        if (this.timeLeft <= 10) {
            timerElement.classList.add('warning');
        }
        if (this.timeLeft <= 5) {
            timerElement.classList.add('danger');
        }
    }

    handleTimeUp() {
        if (this.answerSelected) return;
        
        this.answerSelected = true;
        this.showNotification('Temps écoulé!', 'warning');
        
        // Afficher la bonne réponse
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (btn.dataset.answer === this.currentQuestion.correct) {
                btn.classList.add('correct');
            }
        });
        
        document.getElementById('next-question').disabled = false;
        this.quizHistory.push({
            question: this.currentQuestion.text,
            selected: null,
            correct: this.currentQuestion.correct,
            isCorrect: false,
            timeSpent: 20
        });
    }

    // Méthodes pour les écrans
    showScreen(screenName) {
        // Cacher tous les écrans
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Afficher l'écran demandé
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    // Méthodes pour les catégories
    loadCategories() {
        const categories = [
            {
                id: 'cuisine',
                name: 'Cuisine Africaine',
                description: 'Saveurs et plats traditionnels',
                icon: 'fas fa-utensils'
            },
            {
                id: 'art',
                name: 'Art et Culture',
                description: 'Musique, danse, peinture',
                icon: 'fas fa-palette'
            },
            {
                id: 'histoire',
                name: 'Histoire',
                description: 'Royaumes et civilisations',
                icon: 'fas fa-landmark'
            },
            {
                id: 'geographie',
                name: 'Géographie',
                description: 'Pays, fleuves, montagnes',
                icon: 'fas fa-globe-africa'
            },
            {
                id: 'langues',
                name: 'Langues',
                description: 'Plus de 2000 langues',
                icon: 'fas fa-language'
            },
            {
                id: 'traditions',
                name: 'Traditions',
                description: 'Coutumes et rituels',
                icon: 'fas fa-hands'
            },
            {
                id: 'savants',
                name: 'Grandes Figures',
                description: 'Savants et héros',
                icon: 'fas fa-users'
            },
            {
                id: 'nature',
                name: 'Nature et Faune',
                description: 'Animaux et écosystèmes',
                icon: 'fas fa-leaf'
            },
            {
                id: 'sports',
                name: 'Sports',
                description: 'Athlètes et compétitions',
                icon: 'fas fa-futbol'
            },
            {
                id: 'innovation',
                name: 'Innovation',
                description: 'Technologie et startups',
                icon: 'fas fa-lightbulb'
            }
        ];
        
        const grid = document.querySelector('.categories-grid');
        grid.innerHTML = categories.map(cat => `
            <div class="category-card" data-category="${cat.id}">
                <div class="category-icon">
                    <i class="${cat.icon}"></i>
                </div>
                <h3>${cat.name}</h3>
                <p>${cat.description}</p>
            </div>
        `).join('');
    }

    toggleCategory(card) {
        const category = card.dataset.category;
        
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
            card.classList.remove('selected');
        } else {
            this.selectedCategories.add(category);
            card.classList.add('selected');
        }
    }

    // Méthodes pour le mode
    selectMode(mode) {
        this.selectedMode = mode;
        
        // Mettre à jour l'interface
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(`${mode}-mode`).classList.add('active');
    }

    // Méthodes pour la langue
    switchLanguage(lang) {
        this.currentLang = lang;
        
        // Mettre à jour les boutons de langue
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            }
        });
        
        // Recharger les traductions
        this.loadTranslations();
        
        // Recharger les catégories avec les nouvelles traductions
        this.loadCategories();
    }

    // Méthodes pour le paiement
    openPaymentModal(amount) {
        this.currentPaymentAmount = amount;
        document.getElementById('payment-amount').textContent = `${amount} FCFA`;
        document.getElementById('payment-modal').classList.add('active');
    }

    closePaymentModal() {
        document.getElementById('payment-modal').classList.remove('active');
        this.resetPaymentForm();
    }

    selectPaymentMethod(method) {
        document.querySelectorAll('.payment-method').forEach(m => {
            m.classList.remove('active');
        });
        
        document.querySelector(`[data-method="${method}"]`).classList.add('active');
        
        // Afficher le champ approprié
        document.getElementById('phone-number').style.display = 
            method === 'mobile' ? 'block' : 'none';
        document.getElementById('card-number').style.display = 
            method === 'card' ? 'block' : 'none';
    }

    async processPayment() {
        const method = document.querySelector('.payment-method.active').dataset.method;
        let paymentData = {
            amount: this.currentPaymentAmount,
            method: method
        };
        
        if (method === 'mobile') {
            const phone = document.getElementById('phone-number').value;
            if (!this.validatePhone(phone)) {
                this.showNotification('Numéro de téléphone invalide', 'error');
                return;
            }
            paymentData.phone = phone;
        } else {
            const card = document.getElementById('card-number').value;
            if (!this.validateCard(card)) {
                this.showNotification('Numéro de carte invalide', 'error');
                return;
            }
            paymentData.card = card;
        }
        
        try {
            // Envoyer la demande au serveur
            const response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });
            
            const result = await response.json();
            
            if (result.success && result.token) {
                // Ouvrir l'interface FedaPay
                window.FedaPay.checkout({
                    public_key: result.publicKey,
                    transaction: {
                        token: result.token
                    },
                    onClose: () => {
                        this.closePaymentModal();
                    },
                    onSuccess: () => {
                        this.showNotification('Paiement réussi! Merci pour votre soutien.', 'success');
                        this.closePaymentModal();
                    },
                    onError: (error) => {
                        this.showNotification('Erreur de paiement: ' + error.message, 'error');
                    }
                });
            } else {
                throw new Error(result.error || 'Erreur inconnue');
            }
            
        } catch (error) {
            console.error('Erreur paiement:', error);
            this.showNotification('Erreur lors du paiement', 'error');
        }
    }

    resetPaymentForm() {
        document.getElementById('phone-number').value = '';
        document.getElementById('card-number').value = '';
    }

    validatePhone(phone) {
        // Validation simple pour les numéros africains
        const phoneRegex = /^(\+?221|00221|\+?225|00225|\+?229|00229|\+?237|00237)?[0-9]{8,9}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    validateCard(card) {
        // Validation simple pour les cartes
        const cardRegex = /^[0-9]{16}$/;
        return cardRegex.test(card.replace(/\s/g, ''));
    }

    // Méthodes de partage
    async shareScore(platform) {
        const scoreText = `J'ai obtenu ${this.score} points au Quiz Culturel Africain! 🎯`;
        const url = window.location.href;
        
        let shareUrl;
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(scoreText)}&url=${encodeURIComponent(url)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    async copyToClipboard() {
        const text = `J'ai obtenu ${this.score} points au Quiz Culturel Africain! 🎯\n${window.location.href}`;
        
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Lien copié dans le presse-papier!', 'success');
        } catch (error) {
            // Fallback pour les anciens navigateurs
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Lien copié!', 'success');
        }
    }

    // Méthodes de notification
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Méthodes PWA
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker enregistré avec succès:', registration);
                })
                .catch(error => {
                    console.log('Échec enregistrement Service Worker:', error);
                });
        }
    }

    checkOnlineStatus() {
        if (!navigator.onLine) {
            this.showNotification('Mode hors ligne activé', 'warning');
        }
    }

    // Restart quiz
    restartQuiz() {
        this.quizStarted = false;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.totalTime = 0;
        this.questions = [];
        this.quizHistory = [];
        
        this.showScreen('home');
    }

    // Synchronisation cache
    async syncCachedQuestions() {
        if (navigator.onLine && this.cachedQuestions.length > 0) {
            try {
                // Télécharger un nouveau lot de questions
                const newQuestions = await this.loadQuestionsFromServer();
                await this.cacheQuestions(newQuestions);
            } catch (error) {
                console.error('Erreur synchronisation cache:', error);
            }
        }
    }
}

// Initialiser l'application quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});