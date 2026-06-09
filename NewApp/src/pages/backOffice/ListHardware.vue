<script setup>
import { ref, onMounted } from "vue";

const hardwares = ref([]);
const loading = ref(false);
const error = ref(null);

const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiOTQ2YzY1NjNhYzkyYWM5ZTg4Y2YwZTA5OTQ4MmFlNzdkNDUwYmM2YTM5OTlhZmZjYWYwMmUyNzg3YjdjNDRhZmYwNDhjZjBhMTA5OGUyYjAiLCJpYXQiOjE3ODA1ODIxNzQuNDMwMjY4LCJuYmYiOjE3ODA1ODIxNzQuNDMwMjcyLCJleHAiOjIyNTM5Njc3NzQuMzQ5Nzk2LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.o8cl2CI8Da9fJrJJSYVtj9cGj67-cPZYJfuvRj8DZYO1sH_VPYEs-s7OM_kPjJ7k9dhf3IzXEhblRYMCo1c6a-7J2UTfasOy9koeNZaWy-x-R75MGuh7pHb2Rka4mcMsJZVEbHjs5Iplrf0JPR-HRU9dzPFkbA1I_PJ0bJmeaZEUduD84dpibAME3UEuyU6-fMq-erESsfJQNYet8Bk1ePocSJAxIzTCYttwTIBbSXSSix4-qFA84rL3SUFzECWad9YfrgDh6IqyeX5UW88eCVA_hi_iSy3haR4TmqsGnuhtUsdzScMFDOcqWZbuWja2muxEQ5w6Q_qNycQ4ZqsBJphx9OYnr7wNvqymmLvFqHpPO1obzn5nPfmFbRlw_iFI06tJigrVghC5ibetruhG6b7q_tzBSceRQ-q7CrNStelWeffLWIvz9ZcQCSdpAIfvOi64KlzPLYGMCfDj7_kXkLem5liyq6cCmwoil5ab71zD23WtZdqosfsts4g5iHhqbIyu9tytpULnLmoN0pxU-219Rd94Y2rdI4QRTTp2T0_uoJIT6eOgzQPoGGgo3h40DrH-uhicMtIh-rNOKaccpxmpRPQJtN_fFt0ewsfrnSFS8o2AR43H50DqGOXUG-37ht9pAvTnnrElJpPvZ1z2oB5vRVS8gG8Ac5n0C_PRBPU";

async function getHardwares() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/hardware", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error("Erreur API : " + response.status);
    }

    const data = await response.json();

    // Snipe-IT retourne souvent les données dans data.rows
    hardwares.value = data.rows;

  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getHardwares();
});
</script>

<template>
  <div>
    <h1>Liste des matériels</h1>

    <p v-if="loading">Chargement...</p>

    <p v-if="error">
      {{ error }}
    </p>

    <table v-if="!loading && hardwares.length > 0" border="1">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Asset Tag</th>
          <th>Modèle</th>
          <th>Statut</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="h in hardwares" :key="h.id">
          <td>{{ h.id }}</td>
          <td>{{ h.name }}</td>
          <td>{{ h.asset_tag }}</td>
          <td>{{ h.model?.name }}</td>
          <td>{{ h.status_label?.name }}</td>

        </tr>
      </tbody>
    </table>

    <p v-if="!loading && hardwares.length === 0">
      Aucun matériel trouvé.
    </p>
  </div>
</template>
