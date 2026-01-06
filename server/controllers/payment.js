// FedaPay LIVE placeholder controller.
// Replace the placeholders with actual FedaPay integration using their SDK or REST API.

const createPaymentUrl = async (amount) => {
  // This is a placeholder. In production:
  // - Validate the amount (500/1000/2000/5000)
  // - Create a FedaPay transaction (Mobile Money/card) with your API keys from process.env
  // - Return the redirect/payment URL provided by FedaPay
  // For now, we simulate a payment URL.
  const allowed = [500, 1000, 2000, 5000];
  if (!allowed.includes(Number(amount))) {
    throw new Error('Invalid amount');
  }
  // Simulated URL (replace with real FedaPay link)
  return `https://checkout.example.com/pay?amount=${amount}`;
};

exports.createPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount required' });

    const paymentUrl = await createPaymentUrl(Number(amount));
    // You may persist transaction metadata in a DB or secure store here.
    res.json({ paymentUrl });
  } catch (e) {
    console.error('Payment error:', e.message);
    res.status(400).json({ error: 'Unable to create payment' });
  }
};