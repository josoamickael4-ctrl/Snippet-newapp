<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// --- États Réactifs ---
const loading = ref(false)
const loadingSave = ref(false)
const message = ref('')
const messageOk = ref(true)

// Modèle de données pour les configurations
const configList = ref([
  { status_key: 'New', malagasy_name: 'vaovao', bg_color: '#312e81' },
  { status_key: 'In Progress', malagasy_name: 'efa manao', bg_color: '#854d0e' },
  { status_key: 'Closed', malagasy_name: 'vita', bg_color: '#14532d' }
])

// --- Charger les configurations existantes ---
const fetchConfigs = async () => {
  loading.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/kanban/config')
    if (res.data && res.data.length > 0) {
      // Fusionner avec notre modèle pour être sûr d'avoir les 3 statuts
      res.data.forEach(dbConf => {
        const index = configList.value.findIndex(c => c.status_key === dbConf.status_key)
        if (index !== -1) {
          configList.value[index] = { ...dbConf }
        }
      })
    }
  } catch (e) {
    console.error("Erreur lors de la récupération des configurations:", e)
    message.value = "❌ Impossible de charger la configuration actuelle."
    messageOk.value = false
  } finally {
    loading.value = false
  }
}

// --- Sauvegarder les configurations ---
const validerEtSauvegarder = async () => {
  loadingSave.value = true
  message.value = ''
  try {
    const res = await axios.post('http://localhost:3000/api/kanban/config', configList.value)
    message.value = `✅ ${res.data.message || 'Configuration Kanban enregistrée avec succès'}`
    messageOk.value = true
  } catch (e) {
    console.error("Erreur lors de la sauvegarde de la configuration:", e)
    message.value = `❌ Erreur : ${e.response?.data?.error || e.message}`
    messageOk.value = false
  } finally {
    loadingSave.value = false
  }
}

// --- Réinitialiser aux valeurs d'usine ---
const resetDefaut = () => {
  if (confirm("⚠️ Réinitialiser aux valeurs par défaut ?")) {
    configList.value = [
      { status_key: 'New', malagasy_name: 'vaovao', bg_color: '#312e81' },
      { status_key: 'In Progress', malagasy_name: 'efa manao', bg_color: '#854d0e' },
      { status_key: 'Closed', malagasy_name: 'vita', bg_color: '#14532d' }
    ]
  }
}

onMounted(fetchConfigs)
</script>

<template>
  <div class="card" style="max-width: 750px; margin: 0 auto;">
    <div class="header-section">
      <h1 class="glow-title">⚙️ Configuration du Kanban</h1>
      <p class="subtitle">Personnalisez les noms en malgache et les couleurs de fond des colonnes du tableau Kanban.</p>
    </div>

    <!-- Message de statut -->
    <div v-if="message" :class="['status-msg', messageOk ? '' : 'error-msg']" style="margin-bottom: 2rem; text-align: center;">
      {{ message }}
    </div>

    <div v-if="loading" style="text-align: center; opacity: 0.5; padding: 2rem;">
      Chargement de la configuration...
    </div>

    <div v-else class="settings-form">
      <div v-for="conf in configList" :key="conf.status_key" class="status-setting-card">
        
        <!-- En-tête de la section de statut -->
        <div class="status-card-header">
          <span class="status-tag" :style="{ backgroundColor: conf.bg_color + '44', color: '#fff', borderColor: conf.bg_color }">
            {{ conf.status_key }}
          </span>
          <span class="preview-dot" :style="{ backgroundColor: conf.bg_color }"></span>
        </div>

        <div class="setting-row">
          <!-- Nom en Malgache -->
          <div class="form-group">
            <label>Malgache</label>
            <input
              type="text"
              v-model="conf.malagasy_name"
              placeholder="Ex: vaovao, efa manao..."
              class="form-input"
            />
          </div>

          <!-- Couleur de fond -->
          <div class="form-group color-group">
            <label>Couleur de fond (Colonne)</label>
            <div class="color-picker-wrapper">
              <input
                type="color"
                v-model="conf.bg_color"
                class="color-picker"
              />
              <span class="color-hex-label">{{ conf.bg_color }}</span>
            </div>
          </div>
        </div>

        <!-- Section de prévisualisation en direct -->
        <div class="live-preview" :style="{ backgroundColor: conf.bg_color + '10', borderColor: conf.bg_color + '22' }">
          <div class="preview-title" :style="{ borderLeftColor: conf.bg_color }">
            <span class="p-malagasy">{{ conf.malagasy_name || '—' }}</span>
            <span class="p-english">{{ conf.status_key }}</span>
          </div>
          <div class="preview-card">Ticket Exemple</div>
        </div>

      </div>

      <!-- Actions -->
      <div class="action-buttons">
        <button
          @click="resetDefaut"
          class="btn-reset"
          :disabled="loadingSave"
        >
          🔄 Valeurs par défaut
        </button>
        <button
          @click="validerEtSauvegarder"
          class="btn-save"
          :disabled="loadingSave"
        >
          {{ loadingSave ? 'Enregistrement...' : '💾 Enregistrer la Configuration' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.header-section {
  margin-bottom: 2rem;
}

.glow-title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  opacity: 0.6;
  font-size: 0.92rem;
  margin-top: 0.35rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.status-setting-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.status-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 0.75rem;
}

.status-tag {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  border: 1px solid transparent;
}

.preview-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

.setting-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 600px) {
  .setting-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.form-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Color Picker */
.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.4rem 0.75rem;
}

.color-picker {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 38px;
  height: 38px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.color-hex-label {
  font-family: monospace;
  font-weight: 700;
  font-size: 0.92rem;
  color: #a5b4fc;
}

/* Live Preview Box */
.live-preview {
  border: 1px solid transparent;
  border-radius: 0.75rem;
  padding: 0.85rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.preview-title {
  border-left: 4px solid #fff;
  padding-left: 0.6rem;
  display: flex;
  flex-direction: column;
}

.p-malagasy {
  font-weight: 800;
  font-size: 0.95rem;
  color: #fff;
}

.p-english {
  font-size: 0.7rem;
  opacity: 0.5;
  text-transform: uppercase;
}

.preview-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
}

.btn-reset {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: #fff;
  cursor: pointer;
  padding: 0.8rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.btn-save {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  flex: 1;
}
</style>
