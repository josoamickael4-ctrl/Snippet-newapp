<template>
  <div class="card" style="max-width: 700px; margin: 0 auto;">
    <h1>Gestion & Réinitialisation</h1>

    <!-- Message résultat -->
    <div v-if="message" :class="['status-msg', messageOk ? '' : 'error-msg']" style="text-align:center; margin-bottom: 1.5rem;">
      {{ message }}
      <div v-if="detail" style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.8;">
        <div> SQLite : {{ detail.sqlite }}</div>
        <div> Snipe-IT : {{ detail.snipeit }}</div>
      </div>
    </div>

    <!-- Backup -->
    <div style="margin-bottom: 2.5rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid var(--border);">
      <h3>Sauvegarder les données</h3>
      <p style="opacity: 0.7;">Téléchargez une copie de toutes vos données SQLite locales avant de les supprimer.</p>
      <button @click="downloadBackup" style="background: var(--primary); margin-top: 0.5rem;">
        Télécharger Backup JSON
      </button>
    </div>

    <!-- Reset tout -->
    <div style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(239,68,68,0.08); border-radius: 1rem; border: 1px solid rgba(239,68,68,0.3);">
      <h3>Réinitialisation complète</h3>
      <p style="opacity: 0.7;">Supprime toutes les données SQLite ET Snipe-IT.</p>
      <button
        @click="resetData('all')"
        :disabled="loading"
        style="background: #ef4444; width: 100%; margin-top: 0.75rem; padding: 0.9rem; font-size: 1rem; font-weight: bold;"
      >
        {{ loading ? ' En cours...' : ' RÉINITIALISER TOUT' }}
      </button>
    </div>

    <!-- Reset par type -->
    <div style="padding: 1.5rem; background: rgba(239,68,68,0.05); border-radius: 1rem; border: 1px solid rgba(239,68,68,0.2);">
      <h3>Réinitialisation sélective</h3>
      <p style="opacity: 0.7;">Choisissez un type spécifique à réinitialiser.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">
        <button @click="resetData('assets')"      :disabled="loading" style="background: #ef4444;"> Assets</button>
        <button @click="resetData('accessories')" :disabled="loading" style="background: #ef4444;"> Accessories</button>
        <button @click="resetData('components')"  :disabled="loading" style="background: #ef4444;"> Components</button>
        <button @click="resetData('consumables')" :disabled="loading" style="background: #ef4444;"> Consumables</button>
        <button @click="resetData('licenses')"    :disabled="loading" style="background: #ef4444; grid-column: span 2;"> Licenses</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const loading = ref(false)
const message = ref('')
const messageOk = ref(true)
const detail = ref(null)

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
  } catch {
    message.value = '❌ Erreur lors du téléchargement du backup'
    messageOk.value = false
  }
}

const resetData = async (type) => {
  const labels = {
    all: 'TOUTES les données (SQLite + Snipe-IT)',
    assets: 'les Assets',
    accessories: 'les Accessories',
    components: 'les Components',
    consumables: 'les Consumables',
    licenses: 'les Licenses',
  }
  if (!confirm(`⚠️ Êtes-vous sûr de vouloir réinitialiser ${labels[type]} ?`)) return

  loading.value = true
  message.value = ''
  detail.value = null

  try {
    const res = await axios.post(`http://localhost:3000/api/reset/${type}`)
    message.value = res.data.message
    messageOk.value = res.data.status === 'success'
    detail.value = res.data.detail
  } catch (err) {
    message.value = `❌ Erreur réseau : ${err.message}`
    messageOk.value = false
  } finally {
    loading.value = false
  }
}
</script>