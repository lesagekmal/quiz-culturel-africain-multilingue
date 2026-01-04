const FedaPay = require('fedapay');
const crypto = require('crypto');

class PaymentController {
  constructor() {
    // Configuration FedaPay
    FedaPay.setApiKey(process.env.FEDAPAY_API_KEY);
    FedaPay.setEnvironment(process.env.FEDAPAY_MODE || 'sandbox');
    
    this.webhookSecret = process.env.WEBHOOK_SECRET;
    this.currency = 'XOF';
    
    // Stockage temporaire des transactions (en production, utiliser une base de données)
    this.transactions = new Map();
  }

  async createTransaction(req, res) {
    try {
      const { amount, method, phone, card } = req.body;
      
      // Validation
      if (!amount || !method) {
        return res.status(400).json({ 
          error: 'Montant et méthode de paiement requis' 
        });
      }

      const amountNum = parseInt(amount, 10);
      const validAmounts = [500, 1000, 2000, 5000];
      
      if (!validAmounts.includes(amountNum)) {
        return res.status(400).json({ 
          error: 'Montant invalide. Utilisez: 500, 1000, 2000, 5000 FCFA' 
        });
      }

      if (!['mobile', 'card'].includes(method)) {
        return res.status(400).json({ 
          error: 'Méthode de paiement invalide' 
        });
      }

      if (method === 'mobile' && !phone) {
        return res.status(400).json({ 
          error: 'Numéro de téléphone requis pour Mobile Money' 
        });
      }

      if (method === 'card' && !card) {
        return res.status(400).json({ 
          error: 'Numéro de carte requis' 
        });
      }

      // Créer la transaction FedaPay
      const transactionData = {
        description: `Don Quiz Culturel Africain - ${amountNum} FCFA`,
        amount: amountNum,
        currency: this.currency,
        callback_url: `${req.protocol}://${req.get('host')}/api/payment/webhook`,
        customer: {
          firstname: 'Donateur',
          lastname: 'Quiz Africain',
          email: 'donateur@quiz-africain.com',
          phone_number: method === 'mobile' ? phone : null
        }
      };

      // Ajouter les métadonnées
      transactionData.metadata = {
        source: 'quiz-africain-web',
        method: method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      const transaction = await FedaPay.Transaction.create(transactionData);
      
      // Générer un token pour le checkout
      const token = await FedaPay.Transaction.generateToken(transaction, {
        callback_url: transactionData.callback_url
      });

      // Stocker la transaction temporairement
      const transactionId = transaction.id;
      this.transactions.set(transactionId, {
        id: transactionId,
        amount: amountNum,
        method: method,
        status: 'pending',
        createdAt: new Date(),
        clientIp: req.ip
      });

      // Nettoyer les vieilles transactions (après 24h)
      this.cleanOldTransactions();

      res.json({
        success: true,
        transactionId: transactionId,
        token: token.token,
        publicKey: process.env.FEDAPAY_PUBLIC_KEY,
        amount: amountNum,
        currency: this.currency
      });

    } catch (error) {
      console.error('Erreur création transaction:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la création du paiement',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async handleWebhook(req, res) {
    try {
      // Vérifier la signature du webhook
      const signature = req.headers['x-fdps-signature'];
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(signature, payload)) {
        console.error('Signature webhook invalide');
        return res.status(400).send('Signature invalide');
      }

      const { transaction } = req.body;
      
      if (!transaction || !transaction.id) {
        return res.status(400).send('Données transaction manquantes');
      }

      // Récupérer la transaction depuis FedaPay
      const fedapayTransaction = await FedaPay.Transaction.retrieve(transaction.id);
      
      // Mettre à jour le statut local
      if (this.transactions.has(transaction.id)) {
        const localTransaction = this.transactions.get(transaction.id);
        localTransaction.status = fedapayTransaction.status;
        localTransaction.updatedAt = new Date();
        localTransaction.fedapayData = fedapayTransaction;
        
        this.transactions.set(transaction.id, localTransaction);
        
        console.log(`Transaction ${transaction.id} mise à jour: ${fedapayTransaction.status}`);
        
        // Ici, vous pourriez:
        // 1. Envoyer un email de confirmation
        // 2. Mettre à jour une base de données
        // 3. Notifier un administrateur
        // 4. Débloquer des fonctionnalités premium
      }

      res.status(200).send('Webhook reçu');
    } catch (error) {
      console.error('Erreur webhook:', error);
      res.status(500).send('Erreur webhook');
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;
      
      if (!this.transactions.has(transactionId)) {
        return res.status(404).json({ error: 'Transaction non trouvée' });
      }

      const transaction = this.transactions.get(transactionId);
      
      // Récupérer les infos à jour depuis FedaPay
      try {
        const fedapayTransaction = await FedaPay.Transaction.retrieve(transactionId);
        transaction.status = fedapayTransaction.status;
        this.transactions.set(transactionId, transaction);
      } catch (error) {
        console.warn('Impossible de récupérer statut FedaPay:', error);
      }

      res.json({
        id: transactionId,
        amount: transaction.amount,
        method: transaction.method,
        status: transaction.status,
        createdAt: transaction.createdAt,
        currency: this.currency
      });
    } catch (error) {
      console.error('Erreur getPaymentStatus:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  verifyWebhookSignature(signature, payload) {
    if (!signature) return false;
    
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  cleanOldTransactions() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.createdAt < oneDayAgo) {
        this.transactions.delete(id);
      }
    }
  }

  // Statistiques pour l'admin
  getStatistics() {
    const stats = {
      totalTransactions: this.transactions.size,
      totalAmount: 0,
      byStatus: {},
      byMethod: {},
      byAmount: {}
    };

    for (const transaction of this.transactions.values()) {
      stats.totalAmount += transaction.amount;
      
      // Par statut
      stats.byStatus[transaction.status] = 
        (stats.byStatus[transaction.status] || 0) + 1;
      
      // Par méthode
      stats.byMethod[transaction.method] = 
        (stats.byMethod[transaction.method] || 0) + 1;
      
      // Par montant
      stats.byAmount[transaction.amount] = 
        (stats.byAmount[transaction.amount] || 0) + 1;
    }

    return stats;
  }
}

module.exports = new PaymentController();