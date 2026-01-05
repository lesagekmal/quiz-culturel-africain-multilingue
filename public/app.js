// ============================================
// QUIZ CULTUREL AFRICAIN - APPLICATION COMPLÈTE
// ============================================

console.log('🎯 Quiz Culturel Africain - Chargement...');

class QuizApp {
    constructor() {
        console.log('🔧 Initialisation de QuizApp...');
        
        // État
        this.currentLang = 'fr';
        this.selectedCategories = new Set();
        this.selectedMode = 'normal';
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.totalTime = 0;
        this.timeLeft = 20;
        this.timer = null;
        this.isTimerRunning = false;
        this.answerSelected = false;
        this.quizStarted = false;
        this.quizHistory = [];
        this.deferredPrompt = null; // Pour PWA
        
        // Traductions
        this.translations = {
            fr: {
                'hero_title': 'Testez votre culture africaine',
                'hero_subtitle': 'Découvrez la richesse du continent à travers 10 catégories captivantes',
                'select_mode': 'Choisissez votre mode',
                'normal_mode': 'Mode Normal (20s)',
                'training_mode': 'Mode Entraînement',
                'start_quiz': 'Commencer le quiz',
                'top_players': 'Top 10 Joueurs',
                'support_project': 'Soutenez ce projet',
                'custom_amount_placeholder': 'Montant en FCFA',
                'custom_donate': 'Donner',
                'min_amount': 'Minimum: 500 FCFA',
                'no_scores': 'Aucun score enregistré',
                'install_app': '📲 Installer l\'app',
                'next_question': 'Question suivante',
                'quiz_completed': 'Quiz Terminé !',
                'points': 'points',
                'correct_answers': 'Bonnes réponses :',
                'time_spent': 'Temps passé :',
                'category_best': 'Meilleure catégorie :',
                'play_again': 'Rejouer',
                'back_home': 'Retour à l\'accueil',
                'share_score': 'Partagez votre score',
                'payment_title': 'Soutenir le Quiz Africain',
                'payment_description': 'Votre contribution aide à développer plus de contenu éducatif sur l\'Afrique',
                'mobile_money': 'Mobile Money',
                'credit_card': 'Carte Bancaire',
                'phone_placeholder': 'Numéro de téléphone',
                'card_placeholder': 'Numéro de carte',
                'amount': 'Montant :',
                'confirm_payment': 'Confirmer le paiement',
                'select_category': 'Sélectionnez au moins une catégorie',
                'min_amount_error': 'Montant minimum: 500 FCFA',
                'categories_selected': 'catégorie(s) sélectionnée(s)',
                'install_available': 'Installer l\'application sur votre téléphone !',
                'install_instructions': 'Cliquez sur "Installer" dans la barre d\'URL ou utilisez le menu partage'
            },
            en: {
                'hero_title': 'Test your African culture knowledge',
                'hero_subtitle': 'Discover the richness of the continent through 10 captivating categories',
                'select_mode': 'Choose your mode',
                'normal_mode': 'Normal Mode (20s)',
                'training_mode': 'Training Mode',
                'start_quiz': 'Start Quiz',
                'top_players': 'Top 10 Players',
                'support_project': 'Support this project',
                'custom_amount_placeholder': 'Amount in FCFA',
                'custom_donate': 'Donate',
                'min_amount': 'Minimum: 500 FCFA',
                'no_scores': 'No scores recorded',
                'install_app': '📲 Install App',
                'next_question': 'Next Question',
                'quiz_completed': 'Quiz Completed!',
                'points': 'points',
                'correct_answers': 'Correct answers:',
                'time_spent': 'Time spent:',
                'category_best': 'Best category:',
                'play_again': 'Play Again',
                'back_home': 'Back to Home',
                'share_score': 'Share your score',
                'payment_title': 'Support African Quiz',
                'payment_description': 'Your contribution helps develop more educational content about Africa',
                'mobile_money': 'Mobile Money',
                'credit_card': 'Credit Card',
                'phone_placeholder': 'Phone number',
                'card_placeholder': 'Card number',
                'amount': 'Amount:',
                'confirm_payment': 'Confirm Payment',
                'select_category': 'Select at least one category',
                'min_amount_error': 'Minimum amount: 500 FCFA',
                'categories_selected': 'category(s) selected',
                'install_available': 'Install the app on your phone!',
                'install_instructions': 'Click "Install" in the URL bar or use the share menu'
            }
        };
        
        // Initialiser
        this.init();
    }

    init() {
        console.log('🚀 Démarrage de l\'application...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('📝 Configuration...');
        
        // 1. Configurer PWA
        this.setupPWA();
        
        // 2. Charger les catégories
        this.loadCategories();
        
        // 3. Configurer les événements
        this.setupEventListeners();
        
        // 4. Charger les textes
        this.updateTexts();
        
        // 5. Charger le classement
        this.loadLeaderboard();
        
        // 6. Notification de bienvenue
        this.showNotification('Quiz Culturel Africain prêt !', 'success');
        
        console.log('✅ Application configurée');
    }

    // ============ PWA - INSTALLER L'APP ============
    setupPWA() {
        console.log('📱 Configuration PWA...');
        
        // A. Vérifier si on peut installer
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📲 PWA installable détecté');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
        
        // B. Vérifier si déjà installé
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('📱 Application déjà installée');
        }
        
        // C. Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker enregistré:', registration.scope);
                })
                .catch(error => {
                    console.log('❌ Service Worker échec:', error);
                });
        }
    }

    showInstallButton() {
        // Créer ou mettre à jour le bouton d'installation
        let installBtn = document.getElementById('install-app-btn');
        
        if (!installBtn) {
            // Créer le bouton dans le header
            const header = document.querySelector('header');
            if (header) {
                installBtn = document.createElement('button');
                installBtn.id = 'install-app-btn';
                installBtn.className = 'install-btn';
                installBtn.innerHTML = '<i class="fas fa-download"></i>';
                installBtn.title = this.translations[this.currentLang].install_app;
                
                // Ajouter après le sélecteur de langue
                const langSelector = document.querySelector('.language-selector');
                if (langSelector) {
                    langSelector.parentNode.insertBefore(installBtn, langSelector.nextSibling);
                }
                
                // Événement
                installBtn.addEventListener('click', () => this.installApp());
            }
        }
        
        // Montrer le bouton
        if (installBtn) {
            installBtn.style.display = 'block';
            this.showNotification(this.translations[this.currentLang].install_available, 'info');
        }
    }

    async installApp() {
        if (!this.deferredPrompt) {
            this.showNotification('Installation non disponible', 'error');
            return;
        }
        
        // Afficher la prompt d'installation
        this.deferredPrompt.prompt();
        
        // Attendre le résultat
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('Résultat installation:', outcome);
        
        // Réinitialiser
        this.deferredPrompt = null;
        
        // Cacher le bouton
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
        
        if (outcome === 'accepted') {
            this.showNotification('Application installée avec succès !', 'success');
        }
    }

    // ============ TRADUCTIONS ============
    updateTexts() {
        const langData = this.translations[this.currentLang];
        if (!langData) return;
        
        // Mettre à jour les textes
        this.updateElement('#hero-title', langData.hero_title);
        this.updateElement('#hero-subtitle', langData.hero_subtitle);
        this.updateElement('#select-mode', langData.select_mode);
        
        // Modes
        const normalBtn = document.getElementById('normal-mode');
        const trainingBtn = document.getElementById('training-mode');
        if (normalBtn) normalBtn.querySelector('span').textContent = langData.normal_mode;
        if (trainingBtn) trainingBtn.querySelector('span').textContent = langData.training_mode;
        
        // Boutons
        this.updateElement('#start-quiz', langData.start_quiz);
        this.updateElement('#top-players', langData.top_players);
        this.updateElement('#support-project', langData.support_project);
        
        // Dons personnalisés
        this.updateElement('#custom-amount', langData.custom_amount_placeholder, 'placeholder');
        this.updateElement('#custom-donate-btn', langData.custom_donate);
        this.updateElement('.amount-info', langData.min_amount);
        
        // Quiz
        this.updateElement('#next-question', langData.next_question);
        
        // Bouton installer
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.title = langData.install_app;
        }
    }

    updateElement(selector, text, attribute = 'textContent') {
        const element = document.querySelector(selector);
        if (element) {
            if (attribute === 'textContent') {
                element.textContent = text;
            } else if (attribute === 'placeholder') {
                element.placeholder = text;
            } else if (attribute === 'value') {
                element.value = text;
            } else if (attribute === 'title') {
                element.title = text;
            }
        }
    }

    // ============ CATÉGORIES ============
    loadCategories() {
        const categories = [
            { id: 'cuisine', name: 'Cuisine Africaine', icon: 'fas fa-utensils', desc: 'Saveurs traditionnelles' },
            { id: 'art', name: 'Art et Culture', icon: 'fas fa-palette', desc: 'Musique, danse, peinture' },
            { id: 'histoire', name: 'Histoire', icon: 'fas fa-landmark', desc: 'Royaumes et civilisations' },
            { id: 'geographie', name: 'Géographie', icon: 'fas fa-globe-africa', desc: 'Pays, fleuves, montagnes' },
            { id: 'langues', name: 'Langues', icon: 'fas fa-language', desc: 'Plus de 2000 langues' },
            { id: 'traditions', name: 'Traditions', icon: 'fas fa-hands', desc: 'Coutumes et rituels' },
            { id: 'savants', name: 'Grandes Figures', icon: 'fas fa-users', desc: 'Savants et héros' },
            { id: 'nature', name: 'Nature et Faune', icon: 'fas fa-leaf', desc: 'Animaux et écosystèmes' },
            { id: 'sports', name: 'Sports', icon: 'fas fa-futbol', desc: 'Athlètes et compétitions' },
            { id: 'innovation', name: 'Innovation', icon: 'fas fa-lightbulb', desc: 'Technologie et startups' }
        ];
        
        const grid = document.querySelector('.categories-grid');
        if (!grid) return;
        
        grid.innerHTML = categories.map(cat => `
            <div class="category-card" data-category="${cat.id}">
                <div class="category-icon">
                    <i class="${cat.icon}"></i>
                </div>
                <h3>${cat.name}</h3>
                <p>${cat.desc}</p>
            </div>
        `).join('');
        
        console.log(`✅ ${categories.length} catégories chargées`);
    }

    // ============ ÉVÉNEMENTS ============
    setupEventListeners() {
        // Catégories
        document.addEventListener('click', (e) => {
            const categoryCard = e.target.closest('.category-card');
            if (categoryCard) {
                this.toggleCategory(categoryCard);
                return;
            }
        });
        
        // Modes
        document.getElementById('normal-mode').addEventListener('click', () => {
            this.selectMode('normal');
        });
        
        document.getElementById('training-mode').addEventListener('click', () => {
            this.selectMode('training');
        });
        
        // Démarrer le quiz
        document.getElementById('start-quiz').addEventListener('click', () => {
            this.startQuiz();
        });
        
        // Langues
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.closest('.lang-btn').dataset.lang;
                this.switchLanguage(lang);
            });
        });
        
        // Dons
        document.querySelectorAll('.donation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.target.dataset.amount;
                this.openPaymentModal(amount);
            });
        });
        
        // Don personnalisé
        document.getElementById('custom-donate-btn').addEventListener('click', () => {
            const amount = document.getElementById('custom-amount').value;
            if (!amount || amount < 500) {
                this.showNotification('min_amount_error', 'error');
                return;
            }
            this.openPaymentModal(amount);
        });
        
        // Quiz - Réponses
        document.addEventListener('click', (e) => {
            const answerBtn = e.target.closest('.answer-btn');
            if (answerBtn && !this.answerSelected) {
                this.selectAnswer(answerBtn);
            }
        });
        
        // Question suivante
        document.getElementById('next-question').addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Résultats
        document.getElementById('play-again').addEventListener('click', () => {
            this.restartQuiz();
        });
        
        document.getElementById('back-home').addEventListener('click', () => {
            this.showScreen('home');
        });
        
        console.log('✅ Événements configurés');
    }

    // ============ FONCTIONNALITÉS ============
    toggleCategory(card) {
        const category = card.dataset.category;
        
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
            card.classList.remove('selected');
        } else {
            this.selectedCategories.add(category);
            card.classList.add('selected');
        }
        
        this.showNotification(
            `${this.selectedCategories.size} ${this.translations[this.currentLang].categories_selected}`,
            'info'
        );
    }

    selectMode(mode) {
        this.selectedMode = mode;
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(`${mode}-mode`).classList.add('active');
        
        this.showNotification(
            `Mode: ${mode === 'normal' ? this.translations[this.currentLang].normal_mode : 
                                       this.translations[this.currentLang].training_mode}`,
            'success'
        );
    }

    switchLanguage(lang) {
        this.currentLang = lang;
        
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            }
        });
        
        this.updateTexts();
        
        const langText = lang === 'fr' ? 'Français' : 'English';
        this.showNotification(`Langue: ${langText}`, 'success');
    }

    startQuiz() {
        if (this.selectedCategories.size === 0) {
            this.showNotification('select_category', 'error');
            return;
        }
        
        console.log('🎮 Démarrage avec catégories:', Array.from(this.selectedCategories));
        
        // Générer des questions de test
        this.generateTestQuestions();
        
        // Afficher l'écran quiz
        this.showScreen('quiz');
        
        // Charger la première question
        this.loadQuestion();
        
        // Démarrer le timer
        if (this.selectedMode === 'normal') {
            this.startTimer();
        }
        
        this.showNotification('quiz_started', 'success');
    }

    generateTestQuestions() {
        this.questions = [
            {
                text: "Quel est le plat national du Sénégal ?",
                answers: ["Thiéboudienne", "Mafé", "Attiéké", "Fufu"],
                correct: "Thiéboudienne",
                category: "cuisine"
            },
            {
                text: "Qui est considéré comme le père du cinéma africain ?",
                answers: ["Ousmane Sembène", "Djibril Diop Mambéty", "Gaston Kaboré", "Souleymane Cissé"],
                correct: "Ousmane Sembène",
                category: "art"
            },
            {
                text: "Quel empire ouest-africain était célèbre pour sa richesse en or ?",
                answers: ["Empire du Mali", "Empire Songhaï", "Royaume du Ghana", "Empire du Kanem-Bornou"],
                correct: "Empire du Mali",
                category: "histoire"
            }
        ];
        
        // Ajouter plus de questions
        while (this.questions.length < 10) {
            this.questions.push({
                text: `Question ${this.questions.length + 1} sur la culture africaine ?`,
                answers: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
                correct: "Réponse A",
                category: "general"
            });
        }
    }

    loadQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.finishQuiz();
            return;
        }
        
        this.currentQuestion = this.questions[this.currentQuestionIndex];
        this.answerSelected = false;
        
        // Mettre à jour l'interface
        document.getElementById('question-text').textContent = this.currentQuestion.text;
        document.getElementById('current-category').textContent = this.currentQuestion.category;
        document.getElementById('question-counter').textContent = 
            `${this.translations[this.currentLang].question_counter} ${this.currentQuestionIndex + 1}/${this.questions.length}`;
        
        // Progression
        const progress = ((this.currentQuestionIndex) / this.questions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        
        // Réponses
        this.displayAnswers();
        
        // Désactiver suivant
        document.getElementById('next-question').disabled = true;
    }

    displayAnswers() {
        const container = document.getElementById('answers-container');
        if (!container) return;
        
        const shuffledAnswers = [...this.currentQuestion.answers].sort(() => Math.random() - 0.5);
        
        container.innerHTML = shuffledAnswers.map((answer, index) => `
            <button class="answer-btn" data-answer="${answer}">
                <span class="answer-number">${index + 1}</span>
                <span>${answer}</span>
            </button>
        `).join('');
    }

    selectAnswer(button) {
        if (this.answerSelected) return;
        
        this.answerSelected = true;
        const selectedAnswer = button.dataset.answer;
        const isCorrect = selectedAnswer === this.currentQuestion.correct;
        
        // Mettre à jour l'interface
        button.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        // Si incorrect, montrer la bonne réponse
        if (!isCorrect) {
            document.querySelectorAll('.answer-btn').forEach(btn => {
                if (btn.dataset.answer === this.currentQuestion.correct) {
                    btn.classList.add('correct');
                }
            });
        } else {
            this.correctAnswers++;
            this.score += this.calculateScore();
        }
        
        // Activer suivant
        document.getElementById('next-question').disabled = false;
        
        // Arrêter le timer
        if (this.selectedMode === 'normal') {
            clearInterval(this.timer);
            this.isTimerRunning = false;
        }
        
        // Notification
        this.showNotification(
            isCorrect ? '✅ Bonne réponse !' : '❌ Mauvaise réponse',
            isCorrect ? 'success' : 'error'
        );
    }

    calculateScore() {
        let baseScore = 100;
        if (this.selectedMode === 'normal' && this.timeLeft > 10) {
            baseScore += 50;
        }
        return baseScore;
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.selectedMode === 'normal') {
            this.resetTimer();
            this.startTimer();
        }
        
        this.loadQuestion();
    }

    finishQuiz() {
        this.showScreen('results');
        
        // Calculs
        const totalTime = this.quizHistory.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
        
        // Mettre à jour l'affichage
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('correct-count').textContent = `${this.correctAnswers}/${this.questions.length}`;
        document.getElementById('time-spent').textContent = `${totalTime}s`;
        
        // Sauvegarder le score
        this.saveScore();
    }

    saveScore() {
        const name = prompt('Entrez votre nom pour le classement:', 'Joueur');
        if (!name) return;
        
        const scoreData = {
            name: name,
            score: this.score,
            correct: this.correctAnswers,
            time: this.totalTime,
            date: new Date().toISOString(),
            mode: this.selectedMode
        };
        
        const scores = JSON.parse(localStorage.getItem('quizLeaderboard') || '[]');
        scores.push(scoreData);
        scores.sort((a, b) => b.score - a.score);
        const top10 = scores.slice(0, 10);
        
        localStorage.setItem('quizLeaderboard', JSON.stringify(top10));
        this.loadLeaderboard();
        
        this.showNotification('Score enregistré !', 'success');
    }

    loadLeaderboard() {
        const leaderboard = JSON.parse(localStorage.getItem('quizLeaderboard') || '[]');
        const container = document.getElementById('leaderboard-list');
        
        if (!container) return;
        
        if (leaderboard.length === 0) {
            container.innerHTML = `<p class="no-scores">${this.translations[this.currentLang].no_scores}</p>`;
            return;
        }
        
        container.innerHTML = leaderboard.slice(0, 10).map((player, index) => `
            <div class="leaderboard-item">
                <span class="rank">${index + 1}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-score">${player.score} pts</span>
            </div>
        `).join('');
    }

    // ============ TIMER ============
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
        if (!timerElement) return;
        
        timerElement.textContent = this.timeLeft;
        timerElement.classList.remove('warning', 'danger');
        
        if (this.timeLeft <= 10) timerElement.classList.add('warning');
        if (this.timeLeft <= 5) timerElement.classList.add('danger');
    }

    handleTimeUp() {
        if (this.answerSelected) return;
        
        this.answerSelected = true;
        this.showNotification('⏰ Temps écoulé !', 'warning');
        
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (btn.dataset.answer === this.currentQuestion.correct) {
                btn.classList.add('correct');
            }
        });
        
        document.getElementById('next-question').disabled = false;
    }

    // ============ PAIEMENT ============
    openPaymentModal(amount) {
        if (amount < 500) {
            this.showNotification('min_amount_error', 'error');
            return;
        }
        
        this.currentPaymentAmount = amount;
        document.getElementById('payment-amount').textContent = `${amount} FCFA`;
        document.getElementById('payment-modal').classList.add('active');
    }

    closePaymentModal() {
        document.getElementById('payment-modal').classList.remove('active');
    }

    processPayment() {
        const amount = this.currentPaymentAmount;
        this.showNotification(`Paiement de ${amount} FCFA simulé`, 'info');
        
        setTimeout(() => {
            this.closePaymentModal();
            this.showNotification(`Merci pour votre don de ${amount} FCFA !`, 'success');
        }, 2000);
    }

    // ============ UTILITAIRES ============
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    showNotification(messageKey, type = 'info', customText = null) {
        let message = customText || messageKey;
        
        // Utiliser la traduction si disponible
        if (this.translations[this.currentLang] && 
            this.translations[this.currentLang][messageKey]) {
            message = this.translations[this.currentLang][messageKey];
        }
        
        console.log(`📢 ${type}: ${message}`);
        
        // Créer la notification
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            document.body.appendChild(notification);
        }
        
        // Styles
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };
        
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s;
        `;
        
        // Afficher
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Cacher
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            notification.style.opacity = '0';
        }, 3000);
    }

    restartQuiz() {
        this.quizStarted = false;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.totalTime = 0;
        this.questions = [];
        this.quizHistory = [];
        this.selectedCategories.clear();
        
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.showScreen('home');
    }
}

// ============================================
// DÉMARRAGE
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM chargé');
        window.quizApp = new QuizApp();
    });
} else {
    console.log('📄 DOM déjà chargé');
    window.quizApp = new QuizApp();
}

// Gestion des erreurs
window.addEventListener('error', function(e) {
    console.error('❌ ERREUR:', e.message);
    
    if (window.quizApp && window.quizApp.showNotification) {
        window.quizApp.showNotification(`Erreur: ${e.message.split('\n')[0]}`, 'error');
    }
});

console.log('✅ Application JavaScript prête');