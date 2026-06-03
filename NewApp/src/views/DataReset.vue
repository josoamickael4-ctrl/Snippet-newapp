<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const status = ref('')
const loading = ref(false)
const sources = ref([])
const selectedSource = ref('all')

const fetchSources = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/sources')
    sources.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const downloadBackup = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/data')
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_newapp_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    status.value = 'Erreur lors du téléchargement du backup'
  }
}

const handleReset = async () => {
  const target = selectedSource.value === 'all' ? 'TOUTES les données' : `la source "${selectedSource.value}"`
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ${target} ?`)) return
  
  loading.value = true
  status.value = ''
  try {
    const res = await axios.post('http://localhost:3000/api/reset', {
      source: selectedSource.value === 'all' ? null : selectedSource.value
    })
    status.value = res.data.message
    await fetchSources()
    if (selectedSource.value !== 'all') selectedSource.value = 'all'
  } catch (err) {
    status.value = 'Erreur lors de la réinitialisation'
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchSources)
</script>

<template>
  <div class="card" style="max-width: 700px; margin: 0 auto;">
    <h1>Gestion & Réinitialisation</h1>
    
    <div style="margin-bottom: 2.5rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid var(--border);">
      <h3>Sauvegarder les données</h3>
      <p style="opacity: 0.7;">Téléchargez une copie de toutes vos données SQLite locales avant de les supprimer.</p>
      <button @click="downloadBackup" style="background: var(--primary); margin-top: 0.5rem;">Télécharger Backup JSON</button>
    </div>

    <div style="padding: 1.5rem; background: rgba(239, 68, 68, 0.05); border-radius: 1rem; border: 1px solid rgba(239, 68, 68, 0.2);">
      <h3>Réinitialisation sélective</h3>
      <p style="opacity: 0.7;">Choisissez ce que vous souhaitez supprimer définitivement.</p>
      
      <div style="display: flex; gap: 1rem; align-items: center; margin: 1.5rem 0;">
        <select v-model="selectedSource" style="flex: 1; padding: 0.8rem; border-radius: 0.75rem; background: var(--bg); color: white; border: 1px solid var(--border);">
          <option value="all">Tout supprimer (Total Reset)</option>
          <option v-for="source in sources" :key="source" :value="source">
            Source : {{ source }}
          </option>
        </select>
        
        <button @click="handleReset" :disabled="loading" style="background: #ef4444;">
          {{ loading ? 'Action...' : 'Exécuter' }}
        </button>
      </div>
      
      <p v-if="sources.length === 0" style="font-size: 0.9rem; opacity: 0.5; font-style: italic;">
        Aucune source de données détectée dans la base locale.
      </p>
    </div>
    
    <div v-if="status" :class="status.includes('Erreur') ? 'status-msg error-msg' : 'status-msg'" style="text-align: center;">
      {{ status }}
    </div>
  </div>
</template>
