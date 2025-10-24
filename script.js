document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("payment-form");
  const postalCodeInput = document.getElementById("codePostal");
  const pointRelaisList = document.getElementById("pointRelaisList");
  const relaiSelectBtn = document.getElementById("selectRelaisBtn");
  const selectedRelaisInput = document.getElementById("selectedRelais");
  const widgetPopup = document.getElementById("widgetPopup");
  const closePopup = document.getElementById("closePopup");

  let selectedRelais = null;

  relaiSelectBtn.addEventListener("click", async () => {
    const cp = postalCodeInput.value.trim();
    if (!cp) {
      alert("Merci d’entrer un code postal avant de chercher un point relais.");
      return;
    }

    try {
      const res = await fetch(`/api/mondialrelay?cp=${cp}`);
      const points = await res.json();

      if (points.error || !Array.isArray(points)) {
        alert("Erreur lors de la récupération des points relais.");
        return;
      }

      pointRelaisList.innerHTML = "";
      points.forEach((relai, index) => {
        const li = document.createElement("li");
        li.className = "relais-item";
        li.innerHTML = `
          <strong>${relai.Nom}</strong><br>
          ${relai.Adresse1}, ${relai.CP} ${relai.Ville}
          <br><button class="choisirRelais" data-index="${index}">Choisir</button>
        `;
        pointRelaisList.appendChild(li);
      });

      widgetPopup.style.display = "block";
    } catch (err) {
      console.error("Erreur API Mondial Relay :", err);
      alert("Impossible de charger les points relais.");
    }
  });

  closePopup.addEventListener("click", () => {
    widgetPopup.style.display = "none";
  });

  pointRelaisList.addEventListener("click", (e) => {
    if (e.target.classList.contains("choisirRelais")) {
      const li = e.target.closest("li");
      selectedRelais = li.innerText.trim();
      selectedRelaisInput.value = selectedRelais;
      widgetPopup.style.display = "none";
    }
  });

  // Stripe - paiement
  const stripe = Stripe("pk_live_51RWHfeE4cEWOVVQdBZjduOiwl7nee5Dj0lweLqrRX5MyrHCuUBXteL6yko2FdyKg4v8MT8EStzerBtPtXPmA5TGp00AQLTHeMB");
  const elements = stripe.elements();
  const card = elements.create("card");
  card.mount("#card-element");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedRelaisInput.value) {
      alert("Merci de sélectionner un point relais.");
      return;
    }

    const montant = parseFloat(document.getElementById("montant").value || "0");
    const nom = document.getElementById("nom").value.trim();

    if (!nom || montant <= 0) {
      alert("Veuillez remplir tous les champs correctement.");
      return;
    }

    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: card,
      billing_details: { name: nom }
    });

    if (error) {
      alert(error.message);
      return;
    }

    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montantTotal: montant,
          nomPrenom: nom,
          pointRelaisId: selectedRelaisInput.value,
          payment_method_id: paymentMethod.id, // ✅ nom corrigé ici
        }),
      });

      const data = await res.json();

      if (data.error || res.status >= 400) {
        alert("❌ Paiement échoué : " + (data.message || data.error));
        return;
      }

      const result = await stripe.confirmCardPayment(
  data.clientSecret,
  { payment_method: { card: card } }
);


      if (result.error) {
        alert("💳 Erreur : " + result.error.message);
      } else if (result.paymentIntent.status === "succeeded") {
        alert("✅ Paiement réussi ! Merci 🎉");
        form.reset();
        selectedRelaisInput.value = "";
        card.clear();
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur ou réseau.");
    }
  });
});
