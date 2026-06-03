<script setup>
import { ref } from 'vue'
import axios from 'axios'
import Papa from 'papaparse'

const status = ref('')
const loading = ref(false)
const fileInput = ref(null)
const previewData = ref(null)
const fileName = ref('')
const importMode = ref('append')

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const rawContent = e.target.result
      if (file.name.endsWith('.json')) {
        previewData.value = JSON.parse(rawContent)
      } else if (file.name.endsWith('.csv')) {
        const results = Papa.parse(rawContent, { header: true, skipEmptyLines: true })
        previewData.value = results.data
      }
    } catch (err) {
      status.value = `Erreur de lecture : ${err.message}`
      previewData.value = null
    }
  }
  reader.readAsText(file)
}

const validateData = (data) => {
  if (!Array.isArray(data)) return { valid: false, msg: 'Le contenu doit être une liste (array)' }
  const invalidRows = data.filter(row => !row.asset_tag && !row.model)
  if (invalidRows.length > 0) {
    return { valid: false, msg: `${invalidRows.length} ligne(s) n'ont pas de tag ou de modèle.` }
  }
  return { valid: true }
}

const confirmImport = async () => {
  if (!previewData.value) return
  
  const validation = validateData(previewData.value)
  if (!validation.valid && !confirm(`${validation.msg} Voulez-vous quand même importer ?`)) return

  loading.value = true
  status.value = ''
  try {
    const res = await axios.post('http://localhost:3000/api/import', {
      source: fileName.value,
      content: previewData.value,
      mode: importMode.value
    })
    status.value = res.data.message
    previewData.value = null
  } catch (err) {
    status.value = `Erreur lors de l’importation : ${err.message}`
  } finally {
    loading.value = false
  }
}

const cancelPreview = () => {
  previewData.value = null
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="card">
    <h1>Importation Avancée</h1>
    
    <div v-if="!previewData">
      <p style="opacity: 0.7; margin-bottom: 2rem;">
        Sélectionnez un fichier JSON ou CSV pour visualiser les données avant l'import.
      </p>
      <input type="file" accept=".json,.csv" @change="handleFileSelect" ref="fileInput" />
    </div>

    <div v-else class="preview-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2>Aperçu : {{ fileName }}</h2>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <label>
            Mode :
            <select v-model="importMode" style="padding: 0.5rem; border-radius: 0.5rem; background: var(--glass); color: white; border: 1px solid var(--border);">
              <option value="append">Ajouter</option>
              <option value="replace">Remplacer la source</option>
            </select>
          </label>
          <button @click="confirmImport" :disabled="loading">Confirmer l'Import</button>
          <button @click="cancelPreview" style="background: transparent; border: 1px solid var(--border);">Annuler</button>
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Modèle</th>
              <th>Statut</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewData.slice(0, 100)" :key="i">
              <td :class="{ 'missing': !row.asset_tag }">{{ row.asset_tag || '(vide)' }}</td>
              <td :class="{ 'missing': !row.model }">{{ row.model || '(vide)' }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.notes }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="previewData.length > 100" style="text-align: center; opacity: 0.5;">
          ... et {{ previewData.length - 100 }} autres lignes.
        </p>
      </div>
    </div>

    <div v-if="status" :class="status.includes('Erreur') ? 'status-msg error-msg' : 'status-msg'">
      {{ status }}
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  margin-top: 1rem;
}
.table-scroll {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: rgba(0,0,0,0.2);
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
th {
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 1;
}
.missing {
  color: #f87171;
  font-style: italic;
}
</style>
