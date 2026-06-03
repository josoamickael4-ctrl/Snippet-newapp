<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const localData = ref([])
const snipeStatus = ref('Chargement...')

const fetchData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/data')
    localData.value = res.data
    snipeStatus.value = 'Connecté'
  } catch (err) {
    console.error(err)
    snipeStatus.value = 'Erreur de connexion'
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="card">
    <h1>Tableau de Bord NewApp</h1>
    <p>Statut API Snipe-IT : <span :class="snipeStatus === 'Connecté' ? 'status-msg' : 'error-msg'">{{ snipeStatus }}</span></p>
    
    <div style="margin-top: 2rem;">
      <h2>Données Locales (SQLite)</h2>
      <div v-if="localData.length === 0" style="opacity: 0.5;">
        Aucune donnée importée pour le moment.
      </div>
      <table v-else style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid var(--border);">
            <th style="padding: 0.5rem;">Source</th>
            <th style="padding: 0.5rem;">Date</th>
            <th style="padding: 0.5rem;">Aperçu</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in localData" :key="item.id" style="border-bottom: 1px solid var(--border);">
            <td style="padding: 0.5rem;">{{ item.source }}</td>
            <td style="padding: 0.5rem;">{{ new Date(item.created_at).toLocaleString() }}</td>
            <td style="padding: 0.5rem;">{{ JSON.stringify(item.content).substring(0, 50) }}...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
