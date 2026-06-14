<template>
  <div class="card" style="max-width: 850px; margin: 0 auto;">
    <h1>Cout des tickets</h1>

    <div v-if="loading" style="opacity:0.5; margin-top:2rem;">Chargement...</div>

    <div v-else>
      <!-- Total par categorie -->
      <h3 style="margin-top:1.5rem; margin-bottom:0.75rem;">Total par categorie</h3>
      <table class="tableau">
        <thead>
          <tr><th>Categorie</th><th>Total</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in data.parCategorie" :key="row.categorie">
            <td>{{ row.categorie }}</td>
            <td>{{ row.total }}</td>
          </tr>
          <tr style="font-weight:bold; border-top: 2px solid var(--border);">
            <td>Total general</td>
            <td>{{ data.totalGeneral }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Detail -->
      <h3 style="margin-top:2rem; margin-bottom:0.75rem;">Details</h3>
      <table class="tableau">
        <thead>
          <tr><th>Num Ticket</th><th>Tag</th><th>Categorie</th><th>Cout</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in data.detail" :key="row.num_ticket + row.asset_tag">
            <td>{{ row.num_ticket }}</td>
            <td>{{ row.asset_tag }}</td>
            <td>{{ row.categorie }}</td>
            <td>{{ row.montant }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const data    = ref({ parCategorie: [], detail: [], totalGeneral: 0 })
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets/couts')
    console.log('couts recus:', res.data)
    data.value = res.data
  } catch (e) {
    console.error('erreur chargement couts:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tableau {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
}
th, td {
  padding: 0.65rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}
th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.5;
}
</style>