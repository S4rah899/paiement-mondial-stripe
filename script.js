const stripe = Stripe("pk_live_51RWHfeE4cEWOVVQdBZjduOiwl7nee5Dj0lweLqrRX5MyrHCuUBXteL6yko2FdyKg4v8MT8EStzerBtPtXPmA5TGp00AQLTHeMB");

const elements = stripe.elements();
const cardElement = elements.create("card");
cardElement.mount("#card-element");

const form = document.getElementById("payment-form");
const amountInput = document.getElementById("amount");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("payment-success");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.textContent = "";
  successMessage.textContent = "";

  const amount = parseInt(amountInput.value, 10) * 100;

  if (!amount || amount <= 0) {
    errorMessage.textContent = "Merci de saisir un montant valide.";
    return;
  }

  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
  });

  if (error) {
    errorMessage.textContent = error.message;
    return;
  }

  try {
    const response = await fetch('/api/create-payment', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount,
        payment_method_id: paymentMethod.id
      })
    });

    const data = await response.json();

    if (data.success) {
      successMessage.textContent = "Paiement réussi ! Merci.";
      form.reset();
      cardElement.clear();
    } else if (data.requires_action) {
      await stripe.confirmCardPayment(data.payment_intent_client_secret);
      successMessage.textContent = "Paiement complété avec authentification.";
    } else {
      errorMessage.textContent = data.message || "Erreur de paiement.";
    }
  } catch (err) {
    errorMessage.textContent = "Erreur de communication avec le serveur.";
    console.error(err);
  }
});
