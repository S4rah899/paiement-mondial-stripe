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

    // Appel API Mondial Relay (Vercel Prod)
    try {
      const res = await fetch(
        `https://paiement-mondial-stripe-fxw3zkr6e-sarahs-projects-6a089f26.vercel.app/api/mondialrelay?cp=${cp}`
      );
      const points = await res.json();

      if (points.error) {
        alert("Erreur lors de la récupération des points relais.");
        return;
      }

      // Affiche les points relais dans la popup
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
      const index = e.target.dataset.index;
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

    const res = await fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: document.getElementById("montant").value,
      }),
    });

    const { clientSecret } = await res.json();

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: card,
        billing_details: {
          name: document.getElementById("nom").value,
        },
      },
    });

    if (result.error) {
      alert(result.error.message);
    } else if (result.paymentIntent.status === "succeeded") {
      alert("Paiement réussi !");
      form.reset();
      selectedRelaisInput.value = "";
    }
  });
});
